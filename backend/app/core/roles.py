from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    VIEW_ADMIN = "view_admin"
    USER = "user"


ROLE_LABELS: dict[UserRole, str] = {
    UserRole.ADMIN: "Admin",
    UserRole.VIEW_ADMIN: "View Admin",
    UserRole.USER: "User",
}


def role_label(role: UserRole | str) -> str:
    if isinstance(role, str):
        try:
            role = UserRole(role)
        except ValueError:
            return role
    return ROLE_LABELS.get(role, role.value)
