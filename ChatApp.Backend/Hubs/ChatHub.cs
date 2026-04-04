using Microsoft.AspNetCore.SignalR;
using ChatApp.Backend.Data;
using ChatApp.Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace ChatApp.Backend;

public class ChatHub : Hub
{
    private readonly ChatDbContext _db;

    // Keep server-side room/account assignment per connection.
    private static readonly ConcurrentDictionary<string, (int AccountId, int RoomId)> ConnectionState
        = new();

    public ChatHub(ChatDbContext db)
    {
        _db = db;
    }

    private static string RoomGroupName(int roomId) => $"room-{roomId}";

    public async Task JoinRoom(int roomId, int accountId)
    {
        var member = await _db.RoomMembers
            .AnyAsync(m => m.RoomId == roomId && m.AccountId == accountId);

        if (!member)
            throw new HubException("Not authorized to join this room");
        
        ConnectionState[Context.ConnectionId] = (accountId, roomId);
        await Groups.AddToGroupAsync(Context.ConnectionId, RoomGroupName(roomId));

        var history = await _db.ChatMessages
            .Where(m => m.RoomId == roomId)
            .OrderBy(m => m.SentAt)
            .Take(50)
            .Select(m => new { m.User, m.Message, m.SentAt })
            .ToListAsync();

        await Clients.Caller.SendAsync("ChatHistory", history);
    }

    public async Task LeaveRoom()
    {
        if (ConnectionState.TryRemove(Context.ConnectionId, out var state))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, RoomGroupName(state.RoomId));
        }
    }

    public async Task SendMessage(string message)
    {
        if (!ConnectionState.TryGetValue(Context.ConnectionId, out var state))
            throw new HubException("You must join a room before sending messages.");

        var account = await _db.Accounts.FindAsync(state.AccountId);
        if (account == null)
            throw new HubException("Account not found");

        var chatMessage = new ChatMessage
        {
            User = account.UserName,
            AccountId = state.AccountId,
            RoomId = state.RoomId,
            Message = message
        };

        _db.ChatMessages.Add(chatMessage);
        await _db.SaveChangesAsync();

        await Clients.Group(RoomGroupName(state.RoomId))
            .SendAsync("ReceiveMessage", account.UserName, message, chatMessage.SentAt);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectionState.TryRemove(Context.ConnectionId, out var state))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, RoomGroupName(state.RoomId));
        }

        await base.OnDisconnectedAsync(exception);
    }
}

