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
        
        // gestió paramG
        const gVals = ['0.001','0.010','0.100','1.000'];
        document.getElementById('paramG').addEventListener('input', (e) => {
            const index = parseInt(e.target.value);
            const output = document.getElementById('paramGValue');
            if (output) {
                output.value = gVals[index];
            }
            this.G = parseFloat(gVals[index]);
        });
        
        // gestió paramDim
        const dVals = ['500','1000','1500','2000','2500'];
        document.getElementById('paramDim').addEventListener('input', (e) => {
            const index = parseInt(e.target.value);
            const output = document.getElementById('paramDimValue');
            if (output) {
                output.value = dVals[index];
            }
            this.dimSpace = parseInt(dVals[index], 10);
        });
        
        // gestió paramMassa:
        const massVals = ["5000", "10000", "20000", "40000"];
        document.getElementById('paramMassa').addEventListener('input', (e) => {
            const index = parseInt(e.target.value);
            const output = document.getElementById('paramMassaValue');
            if (output) {
                output.value = massVals[index];
            }
            this.maxMass = parseInt(massVals[index], 10);
        });
        
        // gestió paramDens:
        const densVals = ["0.01", "0.10", "1.00", "10.00", "100.00"];
        document.getElementById('paramDens').addEventListener('input', (e) => {
            const index = parseInt(e.target.value);
            const output = document.getElementById('paramDensValue');
            if (output) {
                output.value = densVals[index];
            }
            this.density = parseFloat(densVals[index]);
            // Recalcular el radi de tots els cossos segons la nova densitat
            this.bodies.forEach(body => {
                body.radius = this.calculateRadius(body.mass);
            });
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
                `Massa: ${body.mass.toFixed(0)}     Velocitat: x=${body.vx.toFixed(2)} y=${body.vy.toFixed(2)}`;
        } else {
            document.getElementById('statusMouse').textContent = `Posició: x=${x.toFixed(0)} y=${y.toFixed(0)}`;
        }
    }

    createBody(mass, x, y, vx, vy) {
        // Validar paràmetres
        if (mass <= 0 || x < 0 || x >= this.dimSpace || y < 0 || y >= this.dimSpace) {
            console.warn('Paràmetres invàlids per crear un cos:', { mass, x, y, vx, vy });
            return;
        };

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

    mergeBodies() {
        let merged = false;
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const body1 = this.bodies[i];
                const body2 = this.bodies[j];
                const dx = body1.x - body2.x;
                const dy = body1.y - body2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < (body1.radius + body2.radius)) {
                    // Conservación de masa y momento lineal
                    const totalMass = body1.mass + body2.mass;
                    const newX = (body1.x * body1.mass + body2.x * body2.mass) / totalMass;
                    const newY = (body1.y * body1.mass + body2.y * body2.mass) / totalMass;
                    const newVx = (body1.vx * body1.mass + body2.vx * body2.mass) / totalMass;
                    const newVy = (body1.vy * body1.mass + body2.vy * body2.mass) / totalMass;
                    
                    this.bodies.splice(j, 1);
                    this.bodies.splice(i, 1);
                    this.bodies.push({
                        mass: totalMass,
                        x: newX,
                        y: newY,
                        vx: newVx,
                        vy: newVy,
                        radius: this.calculateRadius(totalMass)
                    });
                    
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }
        
        if (merged) {
            this.updateStatus();
            this.mergeBodies();
        }
    }

    /**
     * Comprova si algun cos ha de explotar i ho gestiona.
     */
    handleExplosions() {
        for (let i = this.bodies.length - 1; i >= 0; i--) {
            if (this.bodies[i].mass > this.maxMass) {
                this.explodeBody(i);
            }
        }
    }

    /**
     * Lògica de l'explosió d'un cos.
     * @param {number} index - L'índex del cos a explotar a l'array this.bodies.
     */
    explodeBody(index) {
        const body = this.bodies[index]; // Cos a explotar
        const N = Math.floor(Math.random() * 11) + 10; // Genera entre 10 i 20 fragments

        // Dividir el cercle en N sectors amb angles aleatoris
        let randoms = [];
        let total = 0;
        for (let i = 0; i < N; i++) {
            // Assegura que r no sigui mai 0 ni 1
            const r = Math.random() * 0.98 + 0.01;
            randoms.push(r);
            total += r;
        }
        const sectors = randoms.map(r => (r / total) * (2 * Math.PI));

        // Calcular la magnitud del moment per fragment (moment lineal = massa · velocitat)
        const origSpeed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
        const pPerFragment = (body.mass * origSpeed) / N;

        // Elimina el cos original
        this.bodies.splice(index, 1);

        // Dividir el cercle segons els sectors i crear cada fragment
        let currentAngle = 0;
        for (let i = 0; i < N; i++) {
            const theta = sectors[i]; // Angle del sector
            const bisector = currentAngle + theta / 2; // Bisectriu del sector
            // La massa del fragment és la fracció de la massa original segons l'angle del sector
            const fragMass = (theta / (2 * Math.PI)) * body.mass;
            // Calcular la velocitat de manera que: massa_fragment * velocitat = pPerFragment
            const fragSpeed = fragMass > 0 ? pPerFragment / fragMass : 0;
            //console.log(`Fragment ${i + 1}: massa=${fragMass.toFixed(2)}, velocitat=${fragSpeed.toFixed(2)}`);
            // Posicionar el fragment sobre el contorn del cos original més un radi addicional en funció de la velocitat
            // per evitar superposició amb el cos original
            const offsetDist = body.radius * 3 + fragSpeed; // triple del radi++ per evitar superposició
            const fragX = body.x + offsetDist * Math.cos(bisector);
            const fragY = body.y + offsetDist * Math.sin(bisector);
            // La velocitat és radial cap a fora
            const fragVx = fragSpeed * Math.cos(bisector);
            const fragVy = fragSpeed * Math.sin(bisector);
            this.createBody(fragMass, fragX, fragY, fragVx, fragVy);
            currentAngle += theta;
        }
        this.updateStatus();
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

    
    updateStatus() {
        const totalMass = this.bodies.reduce((sum, body) => sum + body.mass, 0);
        document.getElementById('statusTime').textContent = 
            `${this.isRunning ? 'Actiu' : 'Inactiu'}`;
        document.getElementById('statusBodies').textContent = 
            `#Cossos: ${this.bodies.length} | Massa total: ${totalMass.toFixed(0)}`;
    }

    updateFPS(currentTime) {
        this.frameCount++;
        if (currentTime - this.fpsTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsTime));
            document.getElementById('fpsCounter').textContent = `(${this.fps}FPS)`;
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
        this.mergeBodies();
        this.handleExplosions(); // Comprova explosions també en el pas manual
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
            this.mergeBodies();
            this.handleExplosions(); // NOU: Comprovar explosions a cada frame
        }
        
        this.draw();
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
}

// Inicialitzar l'aplicació
window.addEventListener('load', () => {
    new GravitySimulator();
});