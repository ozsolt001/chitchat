using ChatApp.Backend;
using ChatApp.Backend.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

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

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.MapHub<ChatHub>("/chatHub");
app.MapControllers();

app.Run();
