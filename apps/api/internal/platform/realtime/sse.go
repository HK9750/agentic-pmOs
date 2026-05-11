package realtime

import (
	"fmt"
	"net/http"
	"time"

	"agentic-pmos/apps/api/internal/platform/requestid"
)

func Events(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	writeEvent(w, "connected", fmt.Sprintf(`{"request_id":%q}`, requestid.FromContext(r.Context())))
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			writeEvent(w, "heartbeat", fmt.Sprintf(`{"time":%q}`, time.Now().UTC().Format(time.RFC3339)))
			flusher.Flush()
		}
	}
}

func writeEvent(w http.ResponseWriter, event string, data string) {
	_, _ = fmt.Fprintf(w, "event: %s\n", event)
	_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
}
