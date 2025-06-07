class GravitySimulator {
    constructor() {
        this.canvas = document.getElementById('gravCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.bodies = [];
        this.isRunning = false;
        this.animationId = null;
        
        // Paràmetres
        this.G = 0.001;
        this.dimSpace = 1000;
        this.maxMass = 10000;
        this.density = 1.0;
        
        // FPS tracking
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.updateParameters();
        this.animate();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    setupEventListeners() {
        // Controls
        document.getElementById('playBtn').addEventListener('click', () => this.toggleSimulation());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('stepBtn').addEventListener('click', () => this.stepSimulation());
        
        // Parameter inputs
        document.getElementById('paramG').addEventListener('change', (e) => {
            this.G = Math.max(-1, Math.min(1, parseFloat(e.target.value) || this.G));
            e.target.value = this.G;
        });
        
        document.getElementById('paramDim').addEventListener('change', (e) => {
            const newDim = Math.max(100, parseInt(e.target.value) || this.dimSpace);
            if (newDim !== this.dimSpace) {
                this.dimSpace = newDim;
                this.clearAll();
            }
            e.target.value = this.dimSpace;
        });
        
        document.getElementById('paramMassa').addEventListener('change', (e) => {
            this.maxMass = Math.max(100, parseInt(e.target.value) || this.maxMass);
            e.target.value = this.maxMass;
        });
        
        document.getElementById('paramDens').addEventListener('change', (e) => {
            this.density = Math.max(0.01, parseFloat(e.target.value) || this.density);
            e.target.value = this.density.toFixed(2);
        });

        // Canvas events
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.toggleSimulation();
        });
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Escape':
                    this.clearAll();
                    break;
                case 'Space':
                    e.preventDefault();
                    this.stepSimulation();
                    break;
            }
        });
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * this.dimSpace / rect.width;
        const y = (e.clientY - rect.top) * this.dimSpace / rect.height;
        
        const mass = Math.max(1, Math.random() * this.maxMass / 10);
        this.createBody(mass, x, y, 0, 0);
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * this.dimSpace / rect.width;
        const y = (e.clientY - rect.top) * this.dimSpace / rect.height;
        
        const body = this.findBodyAt(x, y);
        if (body) {
            document.getElementById('statusMouse').textContent = 
                `Massa: ${body.mass.toFixed(0)} | Pos: ${x.toFixed(0)},${y.toFixed(0)} | Vel: ${body.vx.toFixed(1)},${body.vy.toFixed(1)}`;
        } else {
            document.getElementById('statusMouse').textContent = `Pos: ${x.toFixed(0)},${y.toFixed(0)}`;
        }
    }

    createBody(mass, x, y, vx, vy) {
        const radius = this.calculateRadius(mass);
        this.bodies.push({
            mass: mass,
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            radius: radius
        });
        this.updateStatus();
    }

    calculateRadius(mass) {
        return Math.pow(mass / (Math.PI * this.density), 1/3);
    }

    findBodyAt(x, y) {
        for (let body of this.bodies) {
            const dx = x - body.x;
            const dy = y - body.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= body.radius) {
                return body;
            }
        }
        return null;
    }

    updateVelocities() {
        for (let i = 0; i < this.bodies.length; i++) {
            let ax = 0, ay = 0;
            
            for (let j = 0; j < this.bodies.length; j++) {
                if (i === j) continue;
                
                const dx = this.bodies[j].x - this.bodies[i].x;
                const dy = this.bodies[j].y - this.bodies[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    const force = this.G * this.bodies[j].mass / (distance * distance);
                    ax += force * dx / distance;
                    ay += force * dy / distance;
                }
            }
            
            this.bodies[i].vx += ax;
            this.bodies[i].vy += ay;
        }
    }

    moveBodies() {
        for (let body of this.bodies) {
            body.x += body.vx;
            body.y += body.vy;
            
            // Efecte toroidal
            if (body.x < 0) body.x += this.dimSpace;
            if (body.x >= this.dimSpace) body.x -= this.dimSpace;
            if (body.y < 0) body.y += this.dimSpace;
            if (body.y >= this.dimSpace) body.y -= this.dimSpace;
        }
    }

    massToColor(mass) {
        const ratio = Math.min(mass / this.maxMass, 1);
        
        const r = Math.floor(255 * (1 - Math.pow(1 - ratio, 2)));
        const g = Math.floor(255 * (1 - Math.pow(2 * ratio - 1, 2)));
        const b = Math.floor(255 * (1 - Math.pow(ratio, 2)));
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    draw() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        for (let body of this.bodies) {
            const x = (body.x * rect.width) / this.dimSpace;
            const y = (body.y * rect.height) / this.dimSpace;
            const radius = Math.max(1, (body.radius * rect.height) / this.dimSpace);
            
            this.ctx.fillStyle = this.massToColor(body.mass);
            this.ctx.strokeStyle = this.ctx.fillStyle;
            
            // Dibuixar cos principal
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Dibuixar cossos en els marges (efecte toroidal)
            if (x - radius < 0) {
                this.ctx.beginPath();
                this.ctx.arc(x + rect.width, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            if (x + radius > rect.width) {
                this.ctx.beginPath();
                this.ctx.arc(x - rect.width, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            if (y - radius < 0) {
                this.ctx.beginPath();
                this.ctx.arc(x, y + rect.height, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            if (y + radius > rect.height) {
                this.ctx.beginPath();
                this.ctx.arc(x, y - rect.height, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            
            // Cantonades
            if (x - radius < 0 && y - radius < 0) {
                this.ctx.beginPath();
                this.ctx.arc(x + rect.width, y + rect.height, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            if (x + radius > rect.width && y + radius > rect.height) {
                this.ctx.beginPath();
                this.ctx.arc(x - rect.width, y - rect.height, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            if (x - radius < 0 && y + radius > rect.height) {
                this.ctx.beginPath();
                this.ctx.arc(x + rect.width, y - rect.height, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            if (x + radius > rect.width && y - radius < 0) {
                this.ctx.beginPath();
                this.ctx.arc(x - rect.width, y + rect.height, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        }
    }

    updateParameters() {
        document.getElementById('paramG').value = this.G;
        document.getElementById('paramDim').value = this.dimSpace;
        document.getElementById('paramMassa').value = this.maxMass;
        document.getElementById('paramDens').value = this.density.toFixed(2);
    }

    updateStatus() {
        document.getElementById('statusTime').textContent = 
            `Temps: ${this.isRunning ? 'Actiu' : 'Inactiu'}`;
        document.getElementById('statusBodies').textContent = 
            `Cossos: ${this.bodies.length}`;
    }

    updateFPS(currentTime) {
        this.frameCount++;
        if (currentTime - this.fpsTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsTime));
            document.getElementById('fpsCounter').textContent = `FPS: ${this.fps}`;
            this.frameCount = 0;
            this.fpsTime = currentTime;
        }
    }

    toggleSimulation() {
        this.isRunning = !this.isRunning;
        document.getElementById('playBtn').textContent = this.isRunning ? '⏸ Parar' : '▶ Iniciar';
        document.getElementById('playBtn').classList.toggle('active', this.isRunning);
        this.updateStatus();
    }

    stepSimulation() {
        this.isRunning = false;
        document.getElementById('playBtn').textContent = '▶ Iniciar';
        document.getElementById('playBtn').classList.remove('active');
        this.updateVelocities();
        this.moveBodies();
        this.updateStatus();
    }

    clearAll() {
        this.bodies = [];
        this.isRunning = false;
        document.getElementById('playBtn').textContent = '▶ Iniciar';
        document.getElementById('playBtn').classList.remove('active');
        this.updateStatus();
    }

    animate(currentTime = 0) {
        this.updateFPS(currentTime);
        
        if (this.isRunning) {
            this.updateVelocities();
            this.moveBodies();
        }
        
        this.draw();
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
}

// Inicialitzar l'aplicació
window.addEventListener('load', () => {
    new GravitySimulator();
});
