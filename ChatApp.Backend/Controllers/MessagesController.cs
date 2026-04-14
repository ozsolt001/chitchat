using System.Security.Claims;
using ChatApp.Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Backend.Controllers;

[ApiController]
[Authorize]
[Route("api/messages")]
public class MessagesController : ControllerBase
{
    private readonly ChatDbContext _db;
    private readonly IHubContext<ChatHub> _hubContext;

    public MessagesController(ChatDbContext db, IHubContext<ChatHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    [HttpDelete("{messageId:int}")]
    public async Task<IActionResult> DeleteMessage(int messageId)
    {
        var accountId = GetCurrentAccountId();
        if (accountId == null)
            return Unauthorized();

        if (messageId <= 0)
            return BadRequest("Invalid message identifier.");

        var chatMessage = await _db.ChatMessages
            .FirstOrDefaultAsync(message => message.Id == messageId);

        if (chatMessage == null)
            return NotFound("Message not found.");

        var isMember = await _db.RoomMembers.AnyAsync(member =>
            member.RoomId == chatMessage.RoomId &&
            member.AccountId == accountId.Value);

        if (!isMember)
            return Forbid();

        if (chatMessage.AccountId != accountId.Value)
            return StatusCode(StatusCodes.Status403Forbidden, "You can only delete your own messages.");

        _db.ChatMessages.Remove(chatMessage);
        await _db.SaveChangesAsync();

        await _hubContext.Clients.Group(ChatHub.RoomGroupName(chatMessage.RoomId))
            .SendAsync("MessageDeleted", new
            {
                id = chatMessage.Id
            });

        return NoContent();
    }

    private int? GetCurrentAccountId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var accountId) ? accountId : null;
    }
}
