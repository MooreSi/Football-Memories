"""player club and card style

Revision ID: b190c1ab0001
Revises: 77cf12b23a29
Create Date: 2026-11-10 12:00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b190c1ab0001"
down_revision: Union[str, Sequence[str], None] = "77cf12b23a29"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Spec 190: club shown on the player card, and the card's style."""
    op.add_column("players", sa.Column("club_name", sa.String(length=200), nullable=True))
    op.add_column(
        "players",
        sa.Column("card_style", sa.String(length=20), server_default="classic", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("players", "card_style")
    op.drop_column("players", "club_name")
