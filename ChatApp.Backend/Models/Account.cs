using Microsoft.AspNetCore.Identity;

namespace ChatApp.Backend.Models;

public class Account : IdentityUser<int>
{
    public string ProfileColor { get; set; } = "#4f8cff";
    public string Mascot { get; set; } = "fox";

    public ICollection<RoomMember> RoomMemberships { get; set; } = new List<RoomMember>();
}
