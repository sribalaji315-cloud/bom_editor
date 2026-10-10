using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Haworth.BOMeditor.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiTranslationJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiTranslationJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Context = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    TargetId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    Provider = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    Model = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    RequestedByUserId = table.Column<string>(type: "TEXT", nullable: true),
                    RequestedByUserName = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    StartedAt = table.Column<long>(type: "INTEGER", nullable: true),
                    CompletedAt = table.Column<long>(type: "INTEGER", nullable: true),
                    TotalItems = table.Column<int>(type: "INTEGER", nullable: false),
                    CompletedItems = table.Column<int>(type: "INTEGER", nullable: false),
                    FailedItems = table.Column<int>(type: "INTEGER", nullable: false),
                    Error = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiTranslationJobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AiTranslationJobItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    JobId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TargetLineId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FieldType = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    SourceText = table.Column<string>(type: "TEXT", nullable: false),
                    Expression = table.Column<string>(type: "TEXT", nullable: true),
                    Error = table.Column<string>(type: "TEXT", nullable: true),
                    AppliedAt = table.Column<long>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiTranslationJobItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiTranslationJobItems_AiTranslationJobs_JobId",
                        column: x => x.JobId,
                        principalTable: "AiTranslationJobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiTranslationJobItems_JobId",
                table: "AiTranslationJobItems",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_AiTranslationJobs_TargetId_CreatedAt",
                table: "AiTranslationJobs",
                columns: new[] { "TargetId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiTranslationJobItems");

            migrationBuilder.DropTable(
                name: "AiTranslationJobs");
        }
    }
}
