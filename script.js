// Change This! replace with your discord id
const userId = '262158823433830402';

// Change This! add your mp3 files here
const songs = [
    'Audio/videoplayback.mp3',
    'Audio/3m.mp3',
    'Audio/yourinsecure.mp3',
];

// click enter to start
document.querySelector('.enter').addEventListener('click', function() {
    this.classList.add('hide');
    const audio = document.getElementById('audio');
    const canvas = document.getElementById('visualizer');
    
    canvas.style.display = 'block';
    
    // pick random song
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    audio.src = randomSong;
    audio.volume = 0.4;
    
    audio.play().catch(e => {
        console.log('audio failed:', e);
    });
    
    setupVisualizer(audio, canvas);
});

// grab discord data from lanyard
fetch('https://api.lanyard.rest/v1/users/' + userId)
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error('profile not found');
        }
        
        const profile = data.data;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('profile').style.display = 'block';

        // set avatar
        const avatar = profile.discord_user?.avatar 
            ? `https://cdn.discordapp.com/avatars/${userId}/${profile.discord_user.avatar}.png?size=256`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
        document.getElementById('avatar').src = avatar;

        // status dot color
        const statusDot = document.getElementById('status');
        const status = profile.discord_status || 'offline';
        statusDot.className = 'dot ' + status;

        // username stuff
        const name = profile.discord_user?.global_name || profile.discord_user?.username || 'user';
        document.getElementById('username').textContent = name;
        document.getElementById('tag').textContent = profile.discord_user?.username || 'unknown';

        // custom status if they have one
        const customStatus = profile.activities?.find(a => a.type === 4);
        if (customStatus?.state) {
            const emoji = customStatus.emoji?.name || '💭';
            document.getElementById('status-emoji').textContent = emoji;
            document.getElementById('status-text').textContent = customStatus.state;
            document.getElementById('status-section').style.display = 'flex';
        }
    })
    .catch(error => {
        console.error('error:', error);
        document.getElementById('loading').innerHTML = '<p style="color: #f23f43;">couldn\'t load profile</p>';
    });

// audio visualizer
function setupVisualizer(audio, canvas) {
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaElementSource(audio);
    
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let smoothedData = new Array(bufferLength).fill(0);
    const smoothFactor = 0.7;

    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        
        analyser.getByteFrequencyData(dataArray);
        
        // smooth out the data
        for (let i = 0; i < bufferLength; i++) {
            smoothedData[i] = smoothFactor * smoothedData[i] + (1 - smoothFactor) * dataArray[i];
        }
        
        // get bass intensity for the background glow
        let bassSum = 0;
        const bassRange = Math.floor(bufferLength * 0.15);
        for (let i = 0; i < bassRange; i++) {
            bassSum += smoothedData[i];
        }
        const bassIntensity = (bassSum / bassRange) / 255;
        
        // purple glow based on bass
        const glowAmount = Math.pow(bassIntensity, 1.2) * 80;
        const r = Math.floor(10 + glowAmount * 0.8);
        const g = Math.floor(10 + glowAmount * 0.2);
        const b = Math.floor(10 + glowAmount * 1.2);
        
        // background color
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // radial glow when bass hits
        if (bassIntensity > 0.3) {
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.height * 0.6
            );
            gradient.addColorStop(0, `rgba(138, 43, 226, ${bassIntensity * 0.3})`);
            gradient.addColorStop(0.5, `rgba(75, 0, 130, ${bassIntensity * 0.15})`);
            gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // center of screen
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // bar settings
        const barCount = 100;
        const maxHeight = canvas.height * 0.35;
        const barWidth = 6;
        const gap = 3;
        const totalWidth = (barWidth + gap) * barCount;
        
        // draw bars
        for (let i = 0; i < barCount; i++) {
            const x = centerX - totalWidth/2 + (i * (barWidth + gap));
            
            // get audio data for symmetry
            const dataIndex1 = Math.floor((i / barCount) * bufferLength * 0.5);
            const dataIndex2 = Math.floor(((barCount - i - 1) / barCount) * bufferLength * 0.5);
            const value = Math.max(
                smoothedData[dataIndex1] / 255,
                smoothedData[dataIndex2] / 255
            );
            
            const height = Math.pow(value, 1.5) * maxHeight;
            
            // bar gradient
            const gradient = ctx.createLinearGradient(0, centerY - height, 0, centerY + height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
            
            // draw top bar
            ctx.fillStyle = gradient;
            ctx.fillRect(x, centerY - height, barWidth, height);
            
            // draw bottom bar
            ctx.fillRect(x, centerY, barWidth, height);
            
            // glow effect
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(x, centerY - height, barWidth, height);
            ctx.fillRect(x, centerY, barWidth, height);
            ctx.shadowBlur = 0;
        }
        
        // center line
        ctx.beginPath();
        ctx.moveTo(centerX - totalWidth/2, centerY);
        ctx.lineTo(centerX + totalWidth/2, centerY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    drawVisualizer();
}
