using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Backend.Migrations
{
    public partial class AddAccountProfileCustomization : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Mascot",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: false,
                defaultValue: "fox");

            migrationBuilder.AddColumn<string>(
                name: "ProfileColor",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: false,
                defaultValue: "#4f8cff");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Mascot",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ProfileColor",
                table: "AspNetUsers");
        }
    }
}
