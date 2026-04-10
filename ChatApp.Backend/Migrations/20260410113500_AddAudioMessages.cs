using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Backend.Migrations
{
    public partial class AddAudioMessages : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DurationMs",
                table: "ChatMessages",
                type: "INTEGER",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DurationMs",
                table: "ChatMessages");
        }
    }
}
