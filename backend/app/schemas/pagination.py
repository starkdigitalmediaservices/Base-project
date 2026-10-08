"""Pagination primitives shared by every list endpoint.

Pagination ALWAYS happens in the database (LIMIT/OFFSET in SQL). See `app.repositories.base`.
"""

import math
from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"


@dataclass(frozen=True, slots=True)
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)

    @classmethod
    def create(cls, items: Sequence[T], *, total: int, params: PageParams) -> "Page[T]":
        return cls(
            items=list(items),
            page=params.page,
            page_size=params.page_size,
            total=total,
            total_pages=math.ceil(total / params.page_size) if total else 0,
        )
