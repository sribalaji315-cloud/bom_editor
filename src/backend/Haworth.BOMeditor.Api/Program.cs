using System.Text;
using System.Text.Json.Serialization;
using Haworth.BOMeditor.Api.Auth;
using Haworth.BOMeditor.Api.Data;
using Haworth.BOMeditor.Api.Endpoints;
using Haworth.BOMeditor.Api.Middleware;
using Haworth.BOMeditor.Api.Services;
using Haworth.BOMeditor.Api.Services.Llm;
using Haworth.BOMeditor.Core.Enums;
using Haworth.BOMeditor.Core.Interfaces;
using Haworth.BOMeditor.Core.Validation;
using Haworth.BOMeditor.Core.Validation.Checks;
using Haworth.BOMeditor.Data;
using Haworth.BOMeditor.Data.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Data Source=bom_editor.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

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
builder.Services.AddScoped<IOperationService, OperationService>();
builder.Services.AddScoped<IValidationRuleService, ValidationRuleService>();
builder.Services.AddScoped<IBomValidationService, BomValidationService>();

// One registration per built-in rule check; BomValidationService resolves them by rule type.
builder.Services.AddScoped<IBomRuleCheck, RequiredFieldCheck>();
builder.Services.AddScoped<IBomRuleCheck, NumericFieldCheck>();
builder.Services.AddScoped<IBomRuleCheck, AllowedValuesCheck>();
builder.Services.AddScoped<IBomRuleCheck, MaxLengthCheck>();
builder.Services.AddScoped<IBomRuleCheck, ReleaseTemplateExistsCheck>();
builder.Services.AddScoped<IBomRuleCheck, RouteCodeExistsCheck>();
builder.Services.AddScoped<IBomRuleCheck, UniqueChildBsObjectIdCheck>();
builder.Services.AddScoped<IBomRuleCheck, MaxDepthCheck>();
builder.Services.AddScoped<IBomRuleCheck, PlmExpressionRequiredCheck>();
builder.Services.AddScoped<IBomRuleCheck, PhantomMustHaveChildrenCheck>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IRouteImportService, RouteImportService>();
builder.Services.AddScoped<ICsvImportService, CsvImportService>();
builder.Services.AddScoped<ICsvExportService, CsvExportService>();

// AI translation: provider API keys are encrypted at rest with Data Protection.
builder.Services.AddDataProtection();
builder.Services.AddScoped<IAiSettingsService, AiSettingsService>();
builder.Services.AddScoped<IAiTranslationService, AiTranslationService>();
builder.Services.AddScoped<IAiTranslationJobService, AiTranslationJobService>();
builder.Services.AddScoped<ILlmClientFactory, LlmClientFactory>();
// Bulk translation runs in the background: one queue, one worker, one job at a time.
builder.Services.AddSingleton<AiTranslationQueue>();
builder.Services.AddHostedService<AiTranslationWorker>();
builder.Services.AddHttpClient<ILlmClient, OpenAiClient>(c => c.Timeout = TimeSpan.FromSeconds(120));
builder.Services.AddHttpClient<ILlmClient, AnthropicClient>(c => c.Timeout = TimeSpan.FromSeconds(120));
builder.Services.AddHttpClient<ILlmClient, GeminiClient>(c => c.Timeout = TimeSpan.FromSeconds(120));

// Serialize enums as strings so the frontend receives "Keep"/"Update" rather than numeric values.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<WorkflowExceptionHandler>();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000"];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Haworth BOM Editor API");
app.MapAuthEndpoints();
app.MapBomEndpoints();
app.MapUserEndpoints();
app.MapReleaseTemplateEndpoints();
app.MapOperationEndpoints();
app.MapRouteEndpoints();
app.MapExportEndpoints();
app.MapValidationEndpoints();
app.MapAiEndpoints();

await DbSeeder.SeedAsync(app.Services);

app.Run();
