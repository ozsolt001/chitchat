using ChatApp.Backend;
using ChatApp.Backend.Data;
using ChatApp.Backend.Models;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:8080");

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
//builder.Services.AddOpenApi();

builder.Services.AddSignalR();
builder.Services.AddControllers();

builder.Services.AddHttpsRedirection(options =>
{
    options.HttpsPort = 5001;
});

builder.Services.AddDbContext<ChatDbContext>(options =>
{
    options.UseSqlite("Data Source=/app/data/chat.db");

    //options.UseSqlite("Data Source=chat.db");
});
builder.Services.AddIdentity<Account, IdentityRole<int>>(options =>
{
    options.User.RequireUniqueEmail = false;
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
    options.SignIn.RequireConfirmedAccount = false;
})
    .AddEntityFrameworkStores<ChatDbContext>()
    .AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "chatapp.auth";
    options.Cookie.HttpOnly = true;
    options.SlidingExpiration = true;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapHub<ChatHub>("/chatHub").RequireAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ChatDbContext>();
    db.Database.Migrate();
    EnsureChatMessageGifColumns(db);
}

app.Run();

//TODO: Undesirable code, try to remove it in the future
static void EnsureChatMessageGifColumns(ChatDbContext db)
{
    var existingColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    var connection = db.Database.GetDbConnection();
    var shouldCloseConnection = connection.State != System.Data.ConnectionState.Open;

    if (shouldCloseConnection)
    {
        connection.Open();
    }

    try
    {
        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA table_info('ChatMessages');";

        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            existingColumns.Add(reader.GetString(1));
        }
    }
    finally
    {
        if (shouldCloseConnection)
        {
            connection.Close();
        }
    }

    if (!existingColumns.Contains("MessageType"))
    {
        db.Database.ExecuteSqlRaw("""
            ALTER TABLE "ChatMessages"
            ADD COLUMN "MessageType" TEXT NOT NULL DEFAULT 'text';
            """);
    }

    if (!existingColumns.Contains("MediaUrl"))
    {
        db.Database.ExecuteSqlRaw("""
            ALTER TABLE "ChatMessages"
            ADD COLUMN "MediaUrl" TEXT NULL;
            """);
    }
}
