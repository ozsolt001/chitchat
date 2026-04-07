using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddChatMessageRoomAndAccountIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AccountId",
                table: "ChatMessages",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RoomId",
                table: "ChatMessages",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountId",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "RoomId",
                table: "ChatMessages");
        }
    }
}
