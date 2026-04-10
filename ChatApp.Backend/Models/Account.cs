using Microsoft.AspNetCore.Identity;

namespace ChatApp.Backend.Models;

public class Account : IdentityUser<int>
{
    public ICollection<RoomMember> RoomMemberships { get; set; } = new List<RoomMember>();
}
