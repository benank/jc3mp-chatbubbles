jcmp.events.Add('PlayerDestroyed', (player) => 
{
    jcmp.events.CallRemote('chatbubbles/remove', null, player.networkId);
})