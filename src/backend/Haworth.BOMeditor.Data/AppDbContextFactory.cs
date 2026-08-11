using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Haworth.BOMeditor.Data;

/// <summary>
/// Design-time factory so `dotnet-ef` can create the context without the Api host.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=classification_tool.db")
            .Options;
        return new AppDbContext(options);
    }
}
