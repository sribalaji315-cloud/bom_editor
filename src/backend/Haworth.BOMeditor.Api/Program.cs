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
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IReleaseTemplateService, ReleaseTemplateService>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IRouteImportService, RouteImportService>();
builder.Services.AddScoped<ICsvImportService, CsvImportService>();
builder.Services.AddScoped<ICsvExportService, CsvExportService>();

// AI translation: provider API keys are encrypted at rest with Data Protection.
builder.Services.AddDataProtection();
builder.Services.AddScoped<IAiSettingsService, AiSettingsService>();
builder.Services.AddScoped<IAiTranslationService, AiTranslationService>();
builder.Services.AddScoped<ILlmClientFactory, LlmClientFactory>();
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

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Haworth BOM Editor API");
app.MapAuthEndpoints();
app.MapBomEndpoints();
app.MapUserEndpoints();
app.MapReleaseTemplateEndpoints();
app.MapRouteEndpoints();
app.MapExportEndpoints();
app.MapAiEndpoints();

await DbSeeder.SeedAsync(app.Services);

app.Run();
