using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Haworth.BOMeditor.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRoutes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RouteAuditEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RouteId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RouteOperationId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Timestamp = table.Column<long>(type: "INTEGER", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: true),
                    UserName = table.Column<string>(type: "TEXT", nullable: true),
                    ChangeType = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    FieldName = table.Column<string>(type: "TEXT", nullable: true),
                    OldValue = table.Column<string>(type: "TEXT", nullable: true),
                    NewValue = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteAuditEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Routes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    RouteNumber = table.Column<string>(type: "TEXT", nullable: true),
                    Name = table.Column<string>(type: "TEXT", nullable: true),
                    RouteGroupId = table.Column<string>(type: "TEXT", nullable: true),
                    Priority = table.Column<string>(type: "TEXT", nullable: true),
                    Condition = table.Column<string>(type: "TEXT", nullable: true),
                    Formula = table.Column<string>(type: "TEXT", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Routes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RouteOperations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RouteId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    OperationNo = table.Column<string>(type: "TEXT", nullable: true),
                    OperationId = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    DescriptionLen = table.Column<string>(type: "TEXT", nullable: true),
                    NextOperation = table.Column<string>(type: "TEXT", nullable: true),
                    SwingWc = table.Column<string>(type: "TEXT", nullable: true),
                    RuntimeType = table.Column<string>(type: "TEXT", nullable: true),
                    SetUpTime = table.Column<string>(type: "TEXT", nullable: true),
                    Time = table.Column<string>(type: "TEXT", nullable: true),
                    ResourceId = table.Column<string>(type: "TEXT", nullable: true),
                    ResourceGroup = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteOperations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RouteOperations_Routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "Routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RouteAuditEntries_RouteId",
                table: "RouteAuditEntries",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_RouteOperations_RouteId_SortOrder",
                table: "RouteOperations",
                columns: new[] { "RouteId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Routes_Code",
                table: "Routes",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RouteAuditEntries");

            migrationBuilder.DropTable(
                name: "RouteOperations");

            migrationBuilder.DropTable(
                name: "Routes");
        }
    }
}
