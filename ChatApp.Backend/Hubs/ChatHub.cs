using Microsoft.AspNetCore.SignalR;
using ChatApp.Backend.Data;
using ChatApp.Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Backend;

public class ChatHub : Hub
{
    private readonly ChatDbContext _db;

    public ChatHub(ChatDbContext db)
    {
        _db = db;
    }

    public async Task SendMessage(string user, string message)
    {
        Console.WriteLine($"Saving message: {user} - {message}");

        var chatMessage = new ChatMessage
        {
            User = user,
            Message = message
        };

        _db.ChatMessages.Add(chatMessage);
        await _db.SaveChangesAsync();

        Console.WriteLine("Message saved");

        await Clients.All.SendAsync(
            "ReceiveMessage",
            user,
            message,
            chatMessage.SentAt
        );
    }

    public override async Task OnConnectedAsync()
    {
        Console.WriteLine("Client connected, loading history");

        var history = await _db.ChatMessages
            .OrderBy(m => m.SentAt)
            .Take(50)
            .Select(m => new
            {
                m.User,
                m.Message,
                m.SentAt
            })
            .ToListAsync();

        Console.WriteLine($"History count: {history.Count}");

        await Clients.Caller.SendAsync("ChatHistory", history);

        await base.OnConnectedAsync();
    }

}
