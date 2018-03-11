
const max_dist = 50;

const bubbles = {}; // indexed by player network id - .ui .size
const players = {};
const names = [];

jcmp.ui.AddEvent('SecondTick', (s) => 
{
    // Refresh nearby players every second
    for (let i = 0; i < jcmp.players.length; i++)
    {
        const player = jcmp.players[i];
        players[player.networkId] = {player: player, i: i};
    }
})

jcmp.events.AddRemoteCallable('chat_message', (obj, r, g, b) => 
{
    const pid = (JSON.parse(obj)).pid;

    if (pid === undefined) // 
    {
        //jcmp.print(`No pid was found, cannot create chatbubble.`)
        return;
    }

    if (bubbles[pid]) // If we already have a ui, just update it
    {
        bubbles[pid].ui.CallEvent('add', obj, r, g, b);
        return;
    }

    const ui_data = {};
    ui_data.ui_size = new Vector2f(0,0);
    ui_data.up = new Vector3f(0, 0, 0);
    ui_data.ui = new WebUIWindow(
        `chatbubble_${pid}`, 
        `package://chatbubbles/ui/index.html`, 
        new Vector2(jcmp.viewportSize.x, jcmp.viewportSize.y));
    ui_data.ui.autoResize = true;
    ui_data.ui.hidden = true;
    ui_data.ui.autoRenderTexture = false;

    ui_data.is_me = (pid === jcmp.localPlayer.networkId)

    ui_data.ui.AddEvent('chatbubbles/ui/update_size', (w, h) => 
    {
        ui_data.ui_size = new Vector2f(w, h);
        const base = (pid === jcmp.localPlayer.networkId) ? 0.325 : 0.475;
        ui_data.up.y = base + h * 0.0009;
    })

    ui_data.ui.AddEvent('chatbubbles/bubble_ready', () => 
    {
        ui_data.ui.CallEvent('set_name', jcmp.name, JSON.stringify(names));
        ui_data.ui.CallEvent('add', obj, r, g, b);
    })

    bubbles[pid] = ui_data;
    
});


jcmp.events.Add('Render', (r) => 
{
    const cam_pos = jcmp.localPlayer.camera.position;

    for (let id in bubbles)
    {
        const ui_data = bubbles[id];

        if (!players[id]) {continue;} // If the player isn't nearby, don't render
        if (!jcmp.players[players[id].i]) {continue;} // If the player doesn't exist, don't render

        const m = jcmp.players[players[id].i].GetBoneTransform(0xA1C96158, r.dtf).Translate(ui_data.up);

        const dist_to_cam = dist(m.position, cam_pos);

        if (dist_to_cam > max_dist) {continue;} // If it's not within range, don't render

        const pos = r.WorldToScreen(m.position);

        // If it is off the screen, don't draw it
        if (pos.x == -1 && pos.y == -1) {continue;}
        if (ui_data.ui_size.x == 0 || ui_data.ui_size.y == 0) {continue;}

        RenderBubble(r, pos, ui_data, dist_to_cam);
    }

})

function RenderBubble(r, pos, ui_data, dist_to_cam)
{
    const d = (ui_data.is_me) ? dist_to_cam * 0.4 : dist_to_cam * 0.3; // 0.375
    const mod = new Vector2f(1/d, 1/d);
    const new_pos_mod = new Vector2f(ui_data.ui_size.x * mod.x, ui_data.ui_size.y * mod.y);
    const new_size = new Vector2f(ui_data.ui.size.x * mod.x, ui_data.ui.size.y * mod.y);

    // DrawTexture uses floats so ui doesn't shake and glitch
    r.DrawTexture(ui_data.ui.texture, new Vector2f(
        pos.x - new_pos_mod.x / 2,
        pos.y - new_pos_mod.y / 2), new_size);
}

jcmp.events.Add('chat2/AddPlayer', (name) => 
{
    names.push(name);
    jcmp.ui.CallEvent('chatbubble/AddPlayer', name);
})

function dist(v1, v2)
{
    return v2.sub(v1).length;
}