using ChatApp.Backend.Data;
using ChatApp.Backend.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Backend.Controllers;

[ApiController]
[Route("api/rooms")]
public class RoomsController : ControllerBase
{
    private readonly ChatDbContext _db;

    public RoomsController(ChatDbContext db)
    {
        _db = db;
    }

    // 1️⃣ Szoba létrehozása
    [HttpPost]
    public async Task<IActionResult> CreateRoom(CreateRoomRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Room name is required");

        var room = new Room
        {
            Name = request.Name.Trim(),
            IsPrivate = request.IsPrivate
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var membership = new RoomMember
        {
            RoomId = room.Id,
            Role = RoomRole.Admin,
            AccountId = request.CreatorAccountId
        };

        _db.RoomMembers.Add(membership);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            room.Id,
            room.Name,
            room.IsPrivate
        });
    }

    // 2️⃣ Belépés szobába
    [HttpPost("{roomId}/join")]
    public async Task<IActionResult> JoinRoom(int roomId, JoinRoomRequest request)
    {
        var account = await _db.Accounts.FindAsync(request.AccountId);
        if (account == null)
            return NotFound("Account not found");

        var room = await _db.Rooms.FindAsync(roomId);
        if (room == null)
            return NotFound("Room not found");

        var alreadyMember = await _db.RoomMembers.AnyAsync(rm =>
            rm.AccountId == request.AccountId &&
            rm.RoomId == roomId);

        if (alreadyMember)
            return Conflict("Already a member of this room");

        var membership = new RoomMember
        {
            AccountId = request.AccountId,
            RoomId = roomId,
            Role = RoomRole.Member
        };

        _db.RoomMembers.Add(membership);
        await _db.SaveChangesAsync();

        return Ok("Joined room");
    }
}
