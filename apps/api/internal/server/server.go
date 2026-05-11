package server

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"agentic-pmos/apps/api/internal/auth"
	"agentic-pmos/apps/api/internal/config"
	"agentic-pmos/apps/api/internal/platform/health"
	"agentic-pmos/apps/api/internal/platform/httpx"
	"agentic-pmos/apps/api/internal/platform/realtime"
	"agentic-pmos/apps/api/internal/platform/requestid"
	"agentic-pmos/apps/api/internal/projects"
	"agentic-pmos/apps/api/internal/workspaces"
)

type Dependencies struct {
	Config    config.Config
	Logger    *slog.Logger
	DB        *pgxpool.Pool
	Redis     *redis.Client
	StartedAt time.Time
}

func New(deps Dependencies) http.Handler {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(ginRecovery(deps.Logger), ginRequestLogger(deps.Logger), ginSecurityHeaders(), ginCORS(deps.Config.WebOrigin))

	healthHandler := health.Handler{
		DB:        deps.DB,
		Redis:     deps.Redis,
		StartedAt: deps.StartedAt,
	}
	authHandler := auth.Handler{
		DB:     deps.DB,
		Redis:  deps.Redis,
		Config: deps.Config,
	}
	workspaceHandler := workspaces.Handler{DB: deps.DB, Auth: authHandler}
	projectHandler := projects.Handler{DB: deps.DB, Auth: authHandler}

	router.GET("/healthz", gin.WrapF(healthHandler.Liveness))
	router.GET("/readyz", gin.WrapF(healthHandler.Readiness))
	router.GET("/realtime/events", gin.WrapF(realtime.Events))

	api := router.Group("/api/v1")
	api.GET("", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"name":   "agentic-pmos-api",
			"status": "ok",
		})
	})
	api.POST("/auth/register", gin.WrapF(authHandler.Register))
	api.POST("/auth/login", gin.WrapF(authHandler.Login))
	api.GET("/auth/me", gin.WrapF(authHandler.Me))
	api.POST("/auth/logout", gin.WrapF(authHandler.Logout))
	api.POST("/auth/logout-all", gin.WrapF(authHandler.LogoutAll))
	api.PATCH("/auth/password", gin.WrapF(authHandler.ChangePassword))
	api.GET("/auth/sessions", gin.WrapF(authHandler.ListSessions))
	api.POST("/auth/sessions/revoke", gin.WrapF(authHandler.RevokeSession))
	api.PATCH("/profile", gin.WrapF(authHandler.UpdateProfile))
	api.POST("/workspaces", gin.WrapF(workspaceHandler.Create))
	api.GET("/workspaces", gin.WrapF(workspaceHandler.List))
	api.POST("/projects", gin.WrapF(projectHandler.Create))
	api.GET("/projects", gin.WrapF(projectHandler.List))

	return requestid.Middleware(router)
}

func ginRequestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		started := time.Now()
		c.Next()

		logger.Info("http request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration_ms", time.Since(started).Milliseconds(),
			"request_id", requestid.FromContext(c.Request.Context()),
		)
	}
}

func ginRecovery(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error("panic recovered",
					"panic", recovered,
					"stack", string(debug.Stack()),
					"request_id", requestid.FromContext(c.Request.Context()),
				)
				httpx.WriteError(c.Writer, c.Request, http.StatusInternalServerError, "internal_error", "Internal server error")
				c.Abort()
			}
		}()

		c.Next()
	}
}

func ginSecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}

func ginCORS(webOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := strings.TrimSpace(c.GetHeader("Origin"))
		if origin != "" && origin == webOrigin {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, X-Request-ID")
			c.Header("Vary", "Origin")
		}

		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			c.Abort()
			return
		}

		c.Next()
	}
}
