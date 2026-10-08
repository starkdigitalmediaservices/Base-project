"""Model → response-schema conversions that need more than `model_validate`."""

from app.core.permissions import permissions_for_role
from app.models import User
from app.schemas.user import CurrentUser, UserRead


def to_current_user(user: User) -> CurrentUser:
    base = UserRead.model_validate(user)
    return CurrentUser(
        **base.model_dump(),
        permissions=sorted(permission.value for permission in permissions_for_role(user.role.name)),
    )
