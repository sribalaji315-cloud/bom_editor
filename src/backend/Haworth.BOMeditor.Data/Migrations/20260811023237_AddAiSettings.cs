using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Haworth.BOMeditor.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiInstructions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Context = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    SystemInstructions = table.Column<string>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiInstructions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AiProviderConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Provider = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Model = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    ApiKeyEncrypted = table.Column<string>(type: "TEXT", nullable: true),
                    Enabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiProviderConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AiSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ActiveProvider = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    GroundingEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    GroundingFileName = table.Column<string>(type: "TEXT", nullable: true),
                    GroundingFilePath = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiInstructions_Context",
                table: "AiInstructions",
                column: "Context",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiProviderConfigs_Provider",
                table: "AiProviderConfigs",
                column: "Provider",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiInstructions");

            migrationBuilder.DropTable(
                name: "AiProviderConfigs");

            migrationBuilder.DropTable(
                name: "AiSettings");
        }
    }
}
