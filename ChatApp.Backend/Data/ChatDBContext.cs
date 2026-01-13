using Microsoft.EntityFrameworkCore;
using ChatApp.Backend.Models;

namespace ChatApp.Backend.Data;

public class ChatDbContext : DbContext
{
    public ChatDbContext(DbContextOptions<ChatDbContext> options)
        : base(options)
    {
    }

    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
}
