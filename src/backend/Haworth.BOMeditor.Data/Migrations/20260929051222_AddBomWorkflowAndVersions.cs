using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Haworth.BOMeditor.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBomWorkflowAndVersions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ConcurrencyStamp",
                table: "BomLines",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "BomDocuments",
                type: "TEXT",
                maxLength: 16,
                nullable: false,
                defaultValue: "Draft");

            // Documents that existed before the workflow was introduced start as editable drafts.
            migrationBuilder.Sql("UPDATE \"BomDocuments\" SET \"Status\" = 'Draft' WHERE \"Status\" = '';");

            migrationBuilder.AddColumn<long>(
                name: "StatusChangedAt",
                table: "BomDocuments",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusChangedBy",
                table: "BomDocuments",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BomDocumentVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BomDocumentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    VersionNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    Label = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: true),
                    LineCount = table.Column<int>(type: "INTEGER", nullable: false),
                    SnapshotJson = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BomDocumentVersions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BomDocumentVersions_BomDocumentId_VersionNumber",
                table: "BomDocumentVersions",
                columns: new[] { "BomDocumentId", "VersionNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BomDocumentVersions");

            migrationBuilder.DropColumn(
                name: "ConcurrencyStamp",
                table: "BomLines");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "BomDocuments");

            migrationBuilder.DropColumn(
                name: "StatusChangedAt",
                table: "BomDocuments");

            migrationBuilder.DropColumn(
                name: "StatusChangedBy",
                table: "BomDocuments");
        }
    }
}
