using System.Text;
using System.Text.Json.Serialization;
using Haworth.BOMeditor.Api.Auth;
using Haworth.BOMeditor.Api.Data;
using Haworth.BOMeditor.Api.Endpoints;
using Haworth.BOMeditor.Api.Services;
using Haworth.BOMeditor.Api.Services.Llm;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Data;
using Haworth.BOMeditor.Data.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Data Source=classification_tool.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>();

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
builder.Services.AddSingleton(jwtOptions);
builder.Services.AddSingleton<JwtTokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy(BomEndpoints.EditPolicy, policy => policy.RequireRole(AppRole.Editors))
    .AddPolicy(UserEndpoints.AdminPolicy, policy => policy.RequireRole(AppRole.Admin));

builder.Services.AddScoped<IBomService, BomService>();
builder.Services.AddScoped<ICsvImportService, CsvImportService>();
builder.Services.AddScoped<ICsvExportService, CsvExportService>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IRouteImportService, RouteImportService>();
builder.Services.AddScoped<IReleaseTemplateService, ReleaseTemplateService>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddDataProtection();
builder.Services.AddScoped<IAiSettingsService, AiSettingsService>();
builder.Services.AddScoped<IAiTranslationService, AiTranslationService>();
builder.Services.AddScoped<ILlmClientFactory, LlmClientFactory>();
// Longer timeout: grounded translation calls attach a large reference PDF.
builder.Services.AddHttpClient<ILlmClient, OpenAiClient>(c => c.Timeout = TimeSpan.FromSeconds(120));
builder.Services.AddHttpClient<ILlmClient, AnthropicClient>(c => c.Timeout = TimeSpan.FromSeconds(120));
builder.Services.AddHttpClient<ILlmClient, GeminiClient>(c => c.Timeout = TimeSpan.FromSeconds(120));

// Serialize enums as strings so the frontend receives "Keep"/"Update" rather than numeric values.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000"];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

// If the configured port is already in use, fall back to a free port instead of crashing.
var configuredUrl = builder.Configuration["urls"] ?? "http://localhost:5001";
var resolvedUrls = configuredUrl
    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(EnsureAvailablePort)
    .ToArray();
builder.WebHost.UseUrls(resolvedUrls);

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Haworth BOM Editor API");
app.MapAuthEndpoints();
app.MapBomEndpoints();
app.MapExportEndpoints();
app.MapRouteEndpoints();
app.MapReleaseTemplateEndpoints();
app.MapUserEndpoints();
app.MapAiEndpoints();

await DbSeeder.SeedAsync(app.Services);

app.Run();

// Returns the given url unchanged when its port is free, otherwise swaps in an OS-assigned free port.
static string EnsureAvailablePort(string url)
{
    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Port == 0)
    {
        return url;
    }

    if (IsPortAvailable(uri.Port))
    {
        return url;
    }

    var freePort = GetFreePort();
    var builder = new UriBuilder(uri) { Port = freePort };
    Console.WriteLine($"Port {uri.Port} is in use. Falling back to free port {freePort}: {builder.Uri}");
    return builder.Uri.ToString();
}

static bool IsPortAvailable(int port)
{
    try
    {
        using var listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, port);
        listener.Start();
        return true;
    }
    catch (System.Net.Sockets.SocketException)
    {
        return false;
    }
}

static int GetFreePort()
{
    using var listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 0);
    listener.Start();
    var port = ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
    listener.Stop();
    return port;
}
