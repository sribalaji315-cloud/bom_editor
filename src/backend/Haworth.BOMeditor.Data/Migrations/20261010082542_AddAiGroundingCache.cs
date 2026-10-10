using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Haworth.BOMeditor.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiGroundingCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GroundingHandle",
                table: "AiProviderConfigs",
                type: "TEXT",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "GroundingHandleExpiresAt",
                table: "AiProviderConfigs",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GroundingHash",
                table: "AiProviderConfigs",
                type: "TEXT",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GroundingHandle",
                table: "AiProviderConfigs");

            migrationBuilder.DropColumn(
                name: "GroundingHandleExpiresAt",
                table: "AiProviderConfigs");

            migrationBuilder.DropColumn(
                name: "GroundingHash",
                table: "AiProviderConfigs");
        }
    }
}
