using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Backend.Migrations
{
    /// <inheritdoc />
    public partial class CleanInvalidChatMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM "ChatMessages"
                WHERE "AccountId" = 0 OR "RoomId" = 0;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
