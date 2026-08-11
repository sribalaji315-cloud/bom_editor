using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Haworth.BOMeditor.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoveRouteConditionFormulaToOperation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Condition",
                table: "Routes");

            migrationBuilder.DropColumn(
                name: "Formula",
                table: "Routes");

            migrationBuilder.AddColumn<string>(
                name: "Condition",
                table: "RouteOperations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Formula",
                table: "RouteOperations",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Condition",
                table: "RouteOperations");

            migrationBuilder.DropColumn(
                name: "Formula",
                table: "RouteOperations");

            migrationBuilder.AddColumn<string>(
                name: "Condition",
                table: "Routes",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Formula",
                table: "Routes",
                type: "TEXT",
                nullable: true);
        }
    }
}
