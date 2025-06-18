class GravitySimulator {
    /**
     * Constructor de la classe GravitySimulator
     * Inicialitza els paràmetres de la simulació i els esdeveniments
     */
    constructor() {
        this.canvas = document.getElementById('gravCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.bodies = [];
        this.isRunning = false;
        this.animationId = null;
        
        // Paràmetres de la simulació
        const container = document.querySelector('.canvas-container');
        const rect = container.getBoundingClientRect();
        // Inicialitza les dimensions inicials de l'espai
        this.dimSpace = { x: rect.width, y: rect.height };
        // Guarda l'alçada inicial per calcular els radis
        this.baseHeight = rect.height;
        // Guarda la proporció inicial del canvas
        this.simRatio = this.dimSpace.x / this.dimSpace.y;
        // Constant de gravetat
        this.G = 0.001;
        // Massa màxima per als cossos
        this.maxMass = 10000;
        // Densitat dels cossos
        this.density = 1.0;
        
        // Seguiment dels FPS
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.animate();
    }

    /**
     * Configura el canvas i el seu comportament de redimensionament
     * Manté la proporció del canvas i escala els cossos adequadament
     */
    setupCanvas() {
        const container = document.querySelector('.canvas-container');
        const resizeCanvas = () => {
            const rect = container.getBoundingClientRect();
            let canvasWidth, canvasHeight;
            // Calcula les dimensions mantenint la proporció original (simRatio) dins del contenidor del canvas
            if (rect.width / rect.height > this.simRatio) {
                canvasHeight = rect.height;
                canvasWidth = rect.height * this.simRatio;
            } else {
                canvasWidth = rect.width;
                canvasHeight = rect.width / this.simRatio;
            }
            // Escala les posicions i els radis dels cossos proporcionalment
            const oldDim = { ...this.dimSpace };
            if (oldDim.x && oldDim.y) {
                this.bodies.forEach(body => {
                    body.x = body.x / oldDim.x * canvasWidth;
                    body.y = body.y / oldDim.y * canvasHeight;
                    body.radius = body.radius / oldDim.y * canvasHeight; // Escalat del radi
                });
            }
            // Actualitza dimSpace amb les noves dimensions
            this.dimSpace = { x: canvasWidth, y: canvasHeight };
            this.canvas.width = canvasWidth * window.devicePixelRatio;
            this.canvas.height = canvasHeight * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.canvas.style.width = canvasWidth + 'px';
            this.canvas.style.height = canvasHeight + 'px';
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    /**
     * Configura tots els esdeveniments d'interacció:
     * - Boto de reproducció/pausa
     * - Boto de netejar
     * - Boto de pas a pas
     * - Paràmetres de gravetat, massa màxima i densitat
     * - Esdeveniments del canvas (clic, moviment del ratolí)
     * - Esdeveniments del teclat (ESC, Espai)
     */
    setupEventListeners() {
        // Controls
        document.getElementById('playBtn').addEventListener('click', () => this.toggleSimulation());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('stepBtn').addEventListener('click', () => this.stepSimulation());
        
        // Gestió del paràmetre de gravetat
        const gVals = ['0.001','0.010','0.100','1.000'];
        const paramGInput = document.getElementById('paramG');
        const paramGOutput = document.getElementById('paramGValue');

        // Inicialitza el valor de l'output basant-se en el valor inicial del rang
        if (paramGInput && paramGOutput) {
            const initialIndex = parseInt(paramGInput.value);
            paramGOutput.value = gVals[initialIndex];
            this.G = parseFloat(gVals[initialIndex]); // També inicialitza la constant G
        }

        if (paramGInput) {
            paramGInput.addEventListener('input', (e) => {
                const index = parseInt(e.target.value);
                if (paramGOutput) { paramGOutput.value = gVals[index]; }
                this.G = parseFloat(gVals[index]);
            });
        }
        
        // Gestió del paràmetre de massa màxima
        const massVals = ["5000", "10000", "20000", "40000"];
        const paramMassaInput = document.getElementById('paramMassa');
        const paramMassaOutput = document.getElementById('paramMassaValue');

        // Inicialitza el valor de l'output basant-se en el valor inicial del rang
        if (paramMassaInput && paramMassaOutput) {
            const initialIndex = parseInt(paramMassaInput.value);
            paramMassaOutput.value = massVals[initialIndex];
            this.maxMass = parseInt(massVals[initialIndex], 10); // També inicialitza la massa màxima
        }

        if (paramMassaInput) {
            document.getElementById('paramMassa').addEventListener('input', (e) => {
                const index = parseInt(e.target.value);
                const output = document.getElementById('paramMassaValue');
                if (output) { output.value = massVals[index]; }
                this.maxMass = parseInt(massVals[index], 10);
            });
        }
        
        // Gestió del paràmetre de densitat
        const densVals = ["0.01", "0.10", "1.00", "10.00", "100.00"];
        const paramDensInput = document.getElementById('paramDens');
        const paramDensOutput = document.getElementById('paramDensValue');

        // Inicialitza el valor de l'output basant-se en el valor inicial del rang
        if (paramDensInput && paramDensOutput) {
            const initialIndex = parseInt(paramDensInput.value);
            paramDensOutput.value = densVals[initialIndex];
            this.density = parseFloat(densVals[initialIndex]); // També inicialitza la densitat
            // Recalcular els radis de tots els cossos segons la nova densitat inicial
            this.bodies.forEach(body => {
                body.radius = this.calculateRadius(body.mass);
            });
        }

        if (paramDensInput) {
            document.getElementById('paramDens').addEventListener('input', (e) => {
                const index = parseInt(e.target.value);
                const output = document.getElementById('paramDensValue');
                if (output) { output.value = densVals[index]; }
                this.density = parseFloat(densVals[index]);
                // Recalcular els radis de tots els cossos segons la nova densitat
                this.bodies.forEach(body => {
                    body.radius = this.calculateRadius(body.mass);
                });
            });
        }

        // Esdeveniments del canvas
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.toggleSimulation();
        });
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Esdeveniments del teclat
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

    /**
     * Gestiona el clic del ratolí sobre el canvas
     * Crea un nou cos amb massa aleatòria al punt de clic
     * @param {Event} e - Event de clic del ratolí
     */
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Converteix les coordenades tenint en compte dimensions x i y
        const x = (e.clientX - rect.left) * (this.dimSpace.x / rect.width);
        const y = (e.clientY - rect.top) * (this.dimSpace.y / rect.height);
        
        const mass = Math.max(1, Math.random() * this.maxMass / 10);
        this.createBody(mass, x, y, 0, 0);
    }

    /**
     * Gestiona el moviment del ratolí sobre el canvas
     * Mostra informació del cos si el ratolí està sobre un
     * @param {Event} e - Event de moviment del ratolí
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.dimSpace.x / rect.width);
        const y = (e.clientY - rect.top) * (this.dimSpace.y / rect.height);
        
        const body = this.findBodyAt(x, y);
        if (body) {
            document.getElementById('statusMouse').textContent = 
                `Massa: ${body.mass.toFixed(0)}     Velocitat: x=${body.vx.toFixed(2)} y=${body.vy.toFixed(2)}`;
        } else {
            document.getElementById('statusMouse').textContent = `Posició: x=${x.toFixed(0)} y=${y.toFixed(0)}`;
        }
    }

    /**
     * Crea un nou cos amb les característiques especificades
     * @param {number} mass - Massa del cos
     * @param {number} x - Posició X inicial
     * @param {number} y - Posició Y inicial
     * @param {number} vx - Velocitat inicial en X
     * @param {number} vy - Velocitat inicial en Y
     */
    createBody(mass, x, y, vx, vy) {

        // Ajustar les coordenades per l'efecte toroidal utilitzant l'operador %
        x = ((x % this.dimSpace.x) + this.dimSpace.x) % this.dimSpace.x;
        y = ((y % this.dimSpace.y) + this.dimSpace.y) % this.dimSpace.y;

        // Validar paràmetres de creació del cos
        if (mass <= 0) {
            console.warn('Paràmetres invàlids per crear un cos: massa = ', { mass });
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

    /**
     * Calcula el radi d'un cos basant-se en la seva massa i densitat
     * @param {number} mass - Massa del cos
     * @returns {number} Radi del cos
     */
    calculateRadius(mass) {
        const baseRadius = Math.pow(mass / (Math.PI * this.density), 1/3);
        return baseRadius * (this.dimSpace.y / this.baseHeight);
    }

    /**
     * Calcula la diferència toroidal entre dues posicions
     * @param {number} delta - Diferència entre posicions
     * @param {number} dim - Dimensió de l'espai
     * @returns {number} Diferència toroidal ajustada
     */
    getWrappedDelta(delta, dim) {
        if (Math.abs(delta) > dim / 2) {
            return delta > 0 ? delta - dim : delta + dim;
        }
        return delta;
    }

    /**
     * Troba un cos a una posició donada
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @returns {Object|null} Cos trobat o null si no n'hi ha
     */
    findBodyAt(x, y) {
        for (let body of this.bodies) {
            const dx = this.getWrappedDelta(x - body.x, this.dimSpace.x);
            const dy = this.getWrappedDelta(y - body.y, this.dimSpace.y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= body.radius) { return body; }
        }
        return null;
    }

    /**
     * Actualitza les velocitats de tots els cossos
     * Aplica la força gravitacional entre tots els cossos
     */
    updateVelocities() {
        for (let i = 0; i < this.bodies.length; i++) {
            let ax = 0, ay = 0;
            
            for (let j = 0; j < this.bodies.length; j++) {
                if (i === j) continue;
                
                const dx = this.getWrappedDelta(this.bodies[j].x - this.bodies[i].x, this.dimSpace.x);
                const dy = this.getWrappedDelta(this.bodies[j].y - this.bodies[i].y, this.dimSpace.y);
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

    /**
     * Mou tots els cossos segons les seves velocitats
     * Aplica l'efecte toroidal quan els cossos surten del canvas
     */
    moveBodies() {
        for (let body of this.bodies) {
            body.x += body.vx;
            body.y += body.vy;
            
            // Efecte toroidal
            if (body.x < 0) body.x += this.dimSpace.x;
            if (body.x >= this.dimSpace.x) body.x -= this.dimSpace.x;
            if (body.y < 0) body.y += this.dimSpace.y;
            if (body.y >= this.dimSpace.y) body.y -= this.dimSpace.y;
        }
    }

    /**
     * Converteix la massa d'un cos en un color RGB
     * El color varia segons la massa del cos
     * @param {number} mass - Massa del cos
     * @returns {string} Color en format RGB
     */
    massToColor(mass) {
        const ratio = Math.min(mass / this.maxMass, 1);
        
        const r = Math.floor(255 * (1 - Math.pow(1 - ratio, 2)));
        const g = Math.floor(255 * (1 - Math.pow(2 * ratio - 1, 2)));
        const b = Math.floor(255 * (1 - Math.pow(ratio, 2)));
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Fusiona els cossos que s'enganxen
     * Conserva la massa total i el moment lineal
     */
    mergeBodies() {
        let merged = false;
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const body1 = this.bodies[i], body2 = this.bodies[j];
                // Calcular la diferencia toroidal (usant body1 com a referència)
                const dx = this.getWrappedDelta(body2.x - body1.x, this.dimSpace.x);
                const dy = this.getWrappedDelta(body2.y - body1.y, this.dimSpace.y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < (body1.radius + body2.radius)) {
                    // Conservació de massa i moment lineal amb geometria toroidal
                    const totalMass = body1.mass + body2.mass;
                    // Posició nova: body1.x + (dx ponderat per la massa relativa de body2)
                    let newX = body1.x + dx * (body2.mass / totalMass);
                    let newY = body1.y + dy * (body2.mass / totalMass);
                    // Aplicar l'efecte toroidal a la nova posició
                    newX = ((newX % this.dimSpace.x) + this.dimSpace.x) % this.dimSpace.x;
                    newY = ((newY % this.dimSpace.y) + this.dimSpace.y) % this.dimSpace.y;
                    
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
        
        if (merged) { this.updateStatus(); this.mergeBodies(); }
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

        // Convertir 1 unitat de massa en energia cinètica
        const explosionEnergy = 1 * this.maxMass; // Energia total d'explosió
        const distributedMass = body.mass - 1; // Massa a repartir entre fragments

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

        // Energia cinètica repartida equitativament per fragment
        const energyPerFragment = explosionEnergy / N;
        // Elimina el cos original
        this.bodies.splice(index, 1);

        // Dividir el cercle segons els sectors i crear cada fragment
        let currentAngle = 0;
        for (let i = 0; i < N; i++) {
            const theta = sectors[i]; // Angle del sector
            const bisector = currentAngle + theta / 2; // Bisectriu del sector
            // La massa del fragment és la fracció de la massa distribuïda segons l'angle
            const fragMass = (theta / (2 * Math.PI)) * distributedMass;
            // Determinar la velocitat d'escapament: KE = 1/2 * m * v²  => v = sqrt(2*KE/m)
            const fragSpeed = fragMass > 0 ? Math.sqrt((2 * energyPerFragment) / fragMass) : 0;
            //console.log(`Fragment ${i + 1}: massa=${fragMass.toFixed(2)}, velocitat=${fragSpeed.toFixed(2)}`);
            // Posicionar el fragment amb un offset per evitar superposició
            const offsetDist = body.radius * 3 + fragSpeed;
            let fragX = body.x + offsetDist * Math.cos(bisector);
            let fragY = body.y + offsetDist * Math.sin(bisector);
            // Ajustar les coordenades per l'efecte toroidal
            fragX = ((fragX % this.dimSpace.x) + this.dimSpace.x) % this.dimSpace.x;
            fragY = ((fragY % this.dimSpace.y) + this.dimSpace.y) % this.dimSpace.y;
            const fragVx = body.vx + fragSpeed * Math.cos(bisector);
            const fragVy = body.vy + fragSpeed * Math.sin(bisector);
            this.createBody(fragMass, fragX, fragY, fragVx, fragVy);
            currentAngle += theta;
        }
        this.updateStatus();
    }


    /**
     * Dibuixa tots els cossos al canvas
     * Inclou l'efecte toroidal dibuixant els cossos als marges
     */
    draw() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        for (let body of this.bodies) {
            const x = (body.x * rect.width) / this.dimSpace.x;
            const y = (body.y * rect.height) / this.dimSpace.y;
            const radius = Math.max(1, (body.radius * rect.height) / this.dimSpace.y);
            
            this.ctx.fillStyle = this.massToColor(body.mass);
            this.ctx.strokeStyle = this.ctx.fillStyle;
            
            // Dibuixar cos principal
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Dibuixar cossos en els marges (efecte toroidal)
            if (x - radius < 0) { this.ctx.beginPath(); this.ctx.arc(x + rect.width, y, radius, 0, 2 * Math.PI); this.ctx.fill(); }
            if (x + radius > rect.width) { this.ctx.beginPath(); this.ctx.arc(x - rect.width, y, radius, 0, 2 * Math.PI); this.ctx.fill(); }
            if (y - radius < 0) { this.ctx.beginPath(); this.ctx.arc(x, y + rect.height, radius, 0, 2 * Math.PI); this.ctx.fill(); }
            if (y + radius > rect.height) { this.ctx.beginPath(); this.ctx.arc(x, y - rect.height, radius, 0, 2 * Math.PI); this.ctx.fill(); }
            if (x - radius < 0 && y - radius < 0) { this.ctx.beginPath(); this.ctx.arc(x + rect.width, y + rect.height, radius, 0, 2 * Math.PI); this.ctx.fill(); }
            if (x + radius > rect.width && y + radius > rect.height) { this.ctx.beginPath(); this.ctx.arc(x - rect.width, y - rect.height, radius, 0, 2 * Math.PI); this.ctx.fill(); }
            if (x - radius < 0 && y + radius > rect.height) { this.ctx.beginPath(); this.ctx.arc(x + rect.width, y - rect.height, radius, 0, 2 * Math.PI); this.ctx.fill(); }
            if (x + radius > rect.width && y - radius < 0) { this.ctx.beginPath(); this.ctx.arc(x - rect.width, y + rect.height, radius, 0, 2 * Math.PI); this.ctx.fill(); }
        }
    }

    
    /**
     * Actualitza l'estat de la simulació
     * Mostra els estadístiques: estat, nombre de cossos i massa total
     */
    updateStatus() {
        const totalMass = this.bodies.reduce((sum, body) => sum + body.mass, 0);
        document.getElementById('statusTime').textContent = 
            `${this.isRunning ? 'Actiu' : 'Inactiu'}`;
        document.getElementById('statusBodies').textContent = 
            `#Cossos: ${this.bodies.length} | Massa total: ${totalMass.toFixed(0)}`;
    }

    /**
     * Actualitza els FPS de la simulació
     * @param {number} currentTime - Temps actual en mil·lisegons
     */
    updateFPS(currentTime) {
        this.frameCount++;
        if (currentTime - this.fpsTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsTime));
            document.getElementById('fpsCounter').textContent = `(${this.fps}FPS)`;
            this.frameCount = 0;
            this.fpsTime = currentTime;
        }
    }

    /**
     * Alterna entre reproduir i pausar la simulació
     */
    toggleSimulation() {
        this.isRunning = !this.isRunning;
        document.getElementById('playBtn').textContent = this.isRunning ? '⏸ Parar' : '▶ Iniciar';
        document.getElementById('playBtn').classList.toggle('active', this.isRunning);
        this.updateStatus();
    }

    /**
     * Fa un pas únic de la simulació
     * Pausa la simulació després de l'execució
     */
    stepSimulation() {
        this.isRunning = false;
        document.getElementById('playBtn').textContent = '▶ Iniciar';
        document.getElementById('playBtn').classList.remove('active');
        this.updateVelocities();
        this.moveBodies();
        this.mergeBodies();
        this.handleExplosions();
        this.updateStatus();
    }

    /**
     * Netegja tota la simulació
     * Elimina tots els cossos i reinicia els estadístiques
     */
    clearAll() {
        this.bodies = [];
        this.isRunning = false;
        document.getElementById('playBtn').textContent = '▶ Iniciar';
        document.getElementById('playBtn').classList.remove('active');
        this.updateStatus();
    }

    /**
     * Funció principal d'animació
     * Actualitza la simulació i la dibuixa
     * 
     * @param {number} currentTime - Temps actual en mil·lisegons
     * 
     * Aquesta funció és cridada repetidament per la funció requestAnimationFrame
     * per tal de crear l'efecte d'animació
     */
    animate(currentTime = 0) {
        // Actualitza els FPS de la simulació
        this.updateFPS(currentTime);
        
        // Si la simulació està en marxa, actualitza les velocitats dels cossos
        // i els mou segons les noves velocitats
        if (this.isRunning) {
            this.updateVelocities();
            this.moveBodies();
            this.mergeBodies();
            this.handleExplosions();
        }
        
        this.draw();
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
}

// --- Adaptació automàtica per a mòbil/tàctil ---
function isMobileTouch() {
    return (("ontouchstart" in window) || (navigator.maxTouchPoints > 0)) && window.innerWidth <= 900;
}

function reorganitzaPerMobil() {
    const container = document.getElementById('mainContainer');
    const sidebar = document.getElementById('sidebar');
    const controls = document.getElementById('controls');
    const canvasContainer = document.getElementById('canvasContainer');
    const instruccions = document.getElementById('instruccions');
    const helpBtn = document.getElementById('helpBtn');

    if (isMobileTouch()) {
        // Reorganitza layout: controls a baix, canvas ocupa tot
        container.style.flexDirection = 'column';
        sidebar.style.width = '100vw';
        sidebar.style.maxWidth = '100vw';
        sidebar.style.minWidth = 'unset';
        sidebar.style.height = 'auto';
        sidebar.style.order = '2';
        canvasContainer.style.order = '1';
        canvasContainer.style.height = 'calc(100vh - 80px)';
        canvasContainer.style.width = '100vw';
        canvasContainer.style.maxWidth = '100vw';
        canvasContainer.style.maxHeight = '100vh';
        canvasContainer.style.flex = 'unset';
        // Controls petits
        controls.style.flexDirection = 'row';
        controls.style.flexWrap = 'wrap';
        controls.style.justifyContent = 'center';
        controls.style.alignItems = 'center';
        controls.style.gap = '6px';
        Array.from(controls.getElementsByClassName('control-btn')).forEach(btn => {
            btn.style.width = '38px';
            btn.style.height = '38px';
            btn.style.fontSize = '1.1em';
            btn.style.padding = '0';
            btn.style.borderRadius = '50%';
        });
        // Substitueix instruccions per botó
        if (instruccions) {
            instruccions.style.display = 'none';
            helpBtn.style.display = 'block';
            helpBtn.onclick = function() {
                alert(instruccions.innerText);
            };
        }
    } else {
        // Restaura layout d'escriptori
        container.style.flexDirection = '';
        sidebar.style.width = '';
        sidebar.style.maxWidth = '';
        sidebar.style.minWidth = '';
        sidebar.style.height = '';
        sidebar.style.order = '';
        canvasContainer.style.order = '';
        canvasContainer.style.height = '';
        canvasContainer.style.width = '';
        canvasContainer.style.maxWidth = '';
        canvasContainer.style.maxHeight = '';
        canvasContainer.style.flex = '';
        controls.style.flexDirection = '';
        controls.style.flexWrap = '';
        controls.style.justifyContent = '';
        controls.style.alignItems = '';
        controls.style.gap = '';
        Array.from(controls.getElementsByClassName('control-btn')).forEach(btn => {
            btn.style.width = '';
            btn.style.height = '';
            btn.style.fontSize = '';
            btn.style.padding = '';
            btn.style.borderRadius = '';
        });
        if (instruccions) {
            instruccions.style.display = 'block';
            helpBtn.style.display = 'none';
        }
    }
}
window.addEventListener('load', reorganitzaPerMobil);
window.addEventListener('resize', reorganitzaPerMobil);

// Inicialitzar l'aplicació
window.addEventListener('load', () => {
    new GravitySimulator();
});