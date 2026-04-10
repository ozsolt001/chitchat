using Microsoft.AspNetCore.SignalR;
using ChatApp.Backend.Data;
using ChatApp.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Security.Claims;

namespace ChatApp.Backend;

[Authorize]
public class ChatHub : Hub
{
    private readonly ChatDbContext _db;
    private readonly ILogger<ChatHub> _logger;

    // Keep server-side room/account assignment per connection.
    private static readonly ConcurrentDictionary<string, (int AccountId, int RoomId)> ConnectionState
        = new();

    public ChatHub(ChatDbContext db, ILogger<ChatHub> logger)
    {
        _db = db;
        _logger = logger;
    }

    private static string RoomGroupName(int roomId) => $"room-{roomId}";

    public async Task JoinRoom(int roomId)
    {
        var accountId = GetCurrentAccountId();
        if (accountId == null)
            throw new HubException("Unauthorized.");

        _logger.LogInformation("JoinRoom called for connection {ConnectionId} with roomId={RoomId} and accountId={AccountId}", Context.ConnectionId, roomId, accountId);

        try
        {
            if (roomId <= 0 || accountId <= 0)
                throw new HubException("Invalid room or account identifier.");

            var member = await _db.RoomMembers
                .AnyAsync(m => m.RoomId == roomId && m.AccountId == accountId.Value);

            if (!member)
            {
                _db.RoomMembers.Add(new RoomMember
                {
                    RoomId = roomId,
                    AccountId = accountId.Value,
                    Role = RoomRole.Member
                });

                await _db.SaveChangesAsync();
                _logger.LogInformation("Created missing room membership for account {AccountId} in room {RoomId}.", accountId.Value, roomId);
            }
            
            ConnectionState[Context.ConnectionId] = (accountId.Value, roomId);
            await Groups.AddToGroupAsync(Context.ConnectionId, RoomGroupName(roomId));

            var history = await _db.ChatMessages
                .Where(m => m.RoomId == roomId)
                .OrderBy(m => m.SentAt)
                .Take(50)
                .Select(m => new
                {
                    from = m.User,
                    message = m.Message,
                    sentAt = m.SentAt
                })
                .ToListAsync();

            await Clients.Caller.SendAsync("ChatHistory", history);
        }
        catch (HubException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while joining room {RoomId} for connection {ConnectionId} and account {AccountId}.", roomId, Context.ConnectionId, accountId.Value);
            throw new HubException("Failed to join the room.");
        }
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

        var account = await _db.Users.FindAsync(state.AccountId);
        if (account == null)
            throw new HubException("Account not found");

        var chatMessage = new ChatMessage
        {
            User = account.UserName ?? string.Empty,
            AccountId = state.AccountId,
            RoomId = state.RoomId,
            Message = message
        };

        _db.ChatMessages.Add(chatMessage);
        await _db.SaveChangesAsync();

        await Clients.Group(RoomGroupName(state.RoomId))
            .SendAsync("ReceiveMessage", account.UserName ?? string.Empty, message, chatMessage.SentAt);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectionState.TryRemove(Context.ConnectionId, out var state))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, RoomGroupName(state.RoomId));
        }

        await base.OnDisconnectedAsync(exception);
    }

    private int? GetCurrentAccountId()
    {
        var value = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(value, out var accountId) ? accountId : null;
    }
}

