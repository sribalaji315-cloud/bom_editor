using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Haworth.BOMeditor.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoveRouteGroupPriorityToOperation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "RouteGroupId",
                table: "Routes");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "RouteOperations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RouteGroupId",
                table: "RouteOperations",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Priority",
                table: "RouteOperations");

            migrationBuilder.DropColumn(
                name: "RouteGroupId",
                table: "RouteOperations");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Routes",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RouteGroupId",
                table: "Routes",
                type: "TEXT",
                nullable: true);
        }
    }
}
