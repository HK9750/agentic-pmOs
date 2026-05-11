package rbac

type Role string

const (
	RoleOwner       Role = "owner"
	RoleAdmin       Role = "admin"
	RolePM          Role = "pm"
	RoleDeveloper   Role = "developer"
	RoleQA          Role = "qa"
	RoleStakeholder Role = "stakeholder"
	RoleViewer      Role = "viewer"
)

func CanManageWorkspace(role Role) bool {
	return role == RoleOwner || role == RoleAdmin
}

func CanManageProject(role Role) bool {
	return role == RoleOwner || role == RoleAdmin || role == RolePM
}

func CanApproveExternalWrite(role Role) bool {
	return role == RoleOwner || role == RoleAdmin || role == RolePM
}
