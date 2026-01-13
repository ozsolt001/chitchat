using ChatApp.Backend;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;

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

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();

    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders =
            ForwardedHeaders.XForwardedFor |
            ForwardedHeaders.XForwardedProto
    });
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.MapHub<ChatHub>("/chatHub");
app.MapControllers();

app.Run();
