const MAX_POS_DIFF = 400;

const W_RATIO = 1;
const H_RATIO = 4;

const TEXTURE_SIZE = 1024*Math.pow(2,1);

const RENDERER_RATIO = 0.75;

var hash = document.location.hash.substr( 1 );
if ( hash ) hash = parseInt( hash, 0 );

// Texture width for simulation
const SIZE = 128;

// Water size in system units
const BOUNDS = SIZE*2;
const BOUNDS_HALF = BOUNDS * 0.5;
const WINDOW_FIT_ZOOM = 50000;

var container, camera, scene, renderer;

var lights = [];

var mouseMoved = false;
var mouseCoords = new THREE.Vector2();
var raycaster = new THREE.Raycaster();

var waterMesh;
var meshRay;
var gpuCompute;
var heightmapVariable;
var heightmapUniforms;
var waterUniforms;
var smoothShader;

var noiseFunc = new ImprovedNoise();

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

function convertHex(hexStr) {return parseInt(hexStr.replace(/^#/, ''), 16);}

var mouseIsDown = false;
var timeSinceClick;
var mouseDownInterval;

function mouseDownHandler() {
    mouseIsDown = true;
    timeSinceClick = 0;
    mouseMoved = true;
    mouseDownInterval = setInterval(function () {
        mouseMoved = true;
    }, 1);
}

function mouseUpHandler() {
    mouseIsDown = false;
    clearInterval(mouseDownInterval);
}

function initBackgroundEffect() {
    document.getElementById("main").classList.remove("hidden");
    if ( ! Detector.webgl ) {
        document.getElementById("mainScroll").style.marginTop = "100px";
        maxScroll = 50;
        return;
    }

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 3000 );
    camera.position.set(
        param_vars.camera_pos_x,
        param_vars.camera_pos_y * Math.pow(0.5 + (window.innerHeight/window.innerWidth),1),
        param_vars.camera_pos_z * Math.pow(0.5 + (window.innerHeight/window.innerWidth),1)
    );
    camera.lookAt(new THREE.Vector3(param_vars.camera_lookat_x, param_vars.camera_lookat_y, param_vars.camera_lookat_z));

    scene = new THREE.Scene();
    scene.background = param_vars.background_color;

    var sun1 = new THREE.DirectionalLight( param_vars.light1_color, 1.0 );
    sun1.name = "sun1";
    sun1.position.set( 300, 400, 175 );
    scene.add( sun1 );

    var sun1_inv = new THREE.DirectionalLight( param_vars.light1_color, 0.6 );
    sun1_inv.name = "sun1_inv";
    sun1_inv.position.set( 300, -400, 175 );
    scene.add( sun1_inv );

    var sun2 = new THREE.DirectionalLight( param_vars.light2_color, 0.6 );
    sun2.name = "sun2";
    sun2.position.set( -100, 350, -200 );
    scene.add( sun2 );

    var sun2_inv = new THREE.DirectionalLight( param_vars.light2_color, 0.6 );
    sun2_inv.name = "sun2_inv";
    sun2_inv.position.set( -100, -350, -200 );
    scene.add( sun2_inv );

    lights.push([sun1,sun1_inv]);
    lights.push([sun2,sun2_inv]);

    renderer = new THREE.WebGLRenderer({alpha: true});
    renderer.setClearColor (convertHex(param_vars.background_color), 1);
    renderer.setPixelRatio( window.devicePixelRatio*RENDERER_RATIO );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    // controls = new THREE.OrbitControls( camera, renderer.domElement );
    // controls.autoRotate = true;
    // controls.enablePan = false;
    // controls.enableDamping = true;
    // controls.dampingFactor = 0.35;
    // controls.enableZoom = false;

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mousedown', mouseDownHandler, false );
    document.addEventListener( 'mouseup', mouseUpHandler, false );
    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    document.addEventListener( 'touchmove', onDocumentTouchMove, false );

    window.addEventListener( 'resize', onWindowResize, false );

    initWater();

    // initDatGui();

    animate();

    document.getElementById("main").classList.remove("hidden");
}

function initDatGui() {
    datGui = new dat.GUI();

    var bgColor = datGui.addColor(param_vars,"background_color");
    bgColor.onChange(param_updaters.background_color);

    var light1 = datGui.addColor(param_vars,"light1_color");
    light1.onChange(param_updaters.light1_color);
    var light2 = datGui.addColor(param_vars,"light2_color");
    light2.onChange(param_updaters.light2_color);

    var watColor = datGui.addColor(param_vars,"water_color");
    watColor.onChange(param_updaters.water_color);
    var specColor = datGui.addColor(param_vars,"water_specular");
    specColor.onChange(param_updaters.water_specular);
    var shininessV = datGui.add(param_vars,"water_shininess", 0, 100);
    shininessV.onChange(param_updaters.water_shininess);

    var scrTiming = datGui.add(param_vars,"scroll_timing", -4,4);
    scrTiming.onChange(param_updaters.scroll_timing);

    var rSpacing = datGui.add(param_vars,"repeat_spacing", 0,2);
    rSpacing.onChange(param_updaters.repeat_spacing);

    var mSize = datGui.add(param_vars,"mouse_size",1,50);
    mSize.onChange(param_updaters.mouse_size);

    var visc = datGui.add(param_vars,"viscosity",0,15);
    visc.onChange(param_updaters.viscosity);

    var fSize = datGui.add(param_vars,"font_size",50,500);
    fSize.onFinishChange(param_updaters.redrawTexture);

    var fLeading = datGui.add(param_vars,"font_leading",0,200);
    fLeading.onFinishChange(param_updaters.redrawTexture);

    var posX = datGui.add(param_vars,"pos_x",param_vars.pos_x-MAX_POS_DIFF,param_vars.pos_x+MAX_POS_DIFF);
    posX.onChange(param_updaters.pos_x);
    var posY = datGui.add(param_vars,"pos_y",param_vars.pos_y-MAX_POS_DIFF,param_vars.pos_y+MAX_POS_DIFF);
    posY.onChange(param_updaters.pos_y);
    var posZ = datGui.add(param_vars,"pos_z",param_vars.pos_z-MAX_POS_DIFF,param_vars.pos_z+MAX_POS_DIFF);
    posZ.onChange(param_updaters.pos_z);

    var natRipple = datGui.add(param_vars,"nat_wave_ripple",0,35);
    natRipple.onFinishChange(initWater);

    var natWave = datGui.add(param_vars,"nat_wave_width",0,5);
    natWave.onFinishChange(initWater);

    var gradientStart = datGui.add(param_vars,"gradient_start",-3,3);
    gradientStart.onChange(param_updaters.gradient_start);
    var gradientAmt = datGui.add(param_vars,"gradient_amt",0.01,20);
    gradientAmt.onChange(param_updaters.gradient_amt);
}

function initWater() {
    if (waterMesh) scene.remove(waterMesh);
    if (meshRay) scene.remove(meshRay);
    var materialColor = param_vars.water_color;
    var geometry = new THREE.PlaneBufferGeometry( BOUNDS * W_RATIO, BOUNDS * H_RATIO, (SIZE-1) * W_RATIO, (SIZE-1) * H_RATIO );

    // material: make a ShaderMaterial clone of MeshPhongMaterial, with customized vertex shader
    var material = new THREE.ShaderMaterial( {
        uniforms: THREE.UniformsUtils.merge( [
            THREE.ShaderLib[ 'phong' ].uniforms,
            {
                heightmap: { value: null }
            }
        ] ),
        vertexShader:   document.getElementById( 'water' ).textContent,
        fragmentShader: document.getElementById( 'phong' ).textContent,
        clipping:       false,
        side:           THREE.DoubleSide,
        transparent:    true,
        lights:         true,
        // fog: true
    } );


    // Material attributes from MeshPhongMaterial
    material.color = new THREE.Color( materialColor );
    material.specular = new THREE.Color( param_vars.water_specular );
    material.shininess = param_vars.water_shininess;

    // Sets the uniforms with the material values
    material.uniforms.diffuse.value = material.color;
    material.uniforms.specular.value = material.specular;
    material.uniforms.shininess.value = Math.max( material.shininess, 1e-4 );
    material.uniforms.opacity.value = material.opacity;
    material.uniforms.textTexture   = {
        type: "t",
        value: createTextTexture()
    };
    material.uniforms.u_time = { type: "f",  value: 1.0 };
    material.uniforms.scrollTiming = { type: "f",  value: param_vars.scroll_timing };
    material.uniforms.repeatSpacing = { type: "f",  value: param_vars.repeat_spacing };
    material.uniforms.gradientStart = { type: "f",  value: param_vars.gradient_start };
    material.uniforms.gradientAmt = { type: "f",  value: param_vars.gradient_amt };
    material.uniforms.waterWarp = { type: "f",  value: param_vars.water_warp };
    material.uniforms.u_resolution = { type: "v2",  value: new THREE.Vector2(window.innerWidth,window.innerHeight) };

    // Defines
    material.defines.WIDTH = (SIZE * W_RATIO).toFixed( 1 );
    material.defines.HEIGHT = (SIZE * H_RATIO).toFixed( 1 );
    material.defines.BOUNDS = BOUNDS.toFixed( 1 );

    waterUniforms = material.uniforms;

    waterMesh = new THREE.Mesh( geometry, material );
    waterMesh.rotation.x = - Math.PI / 2;
    waterMesh.matrixAutoUpdate = false;
    waterMesh.updateMatrix();

    scene.add( waterMesh );

    // Mesh just for mouse raycasting
    var geometryRay = new THREE.PlaneBufferGeometry( BOUNDS * W_RATIO, BOUNDS * H_RATIO, 1 * W_RATIO, 1 * H_RATIO );
    meshRay = new THREE.Mesh( geometryRay, new THREE.MeshBasicMaterial( { color: 0xFFFFFF, visible: false } ) );
    meshRay.rotation.x = - Math.PI / 2;
    meshRay.matrixAutoUpdate = false;
    meshRay.updateMatrix();
    scene.add( meshRay );

    // Creates the gpu computation class and sets it up
    gpuCompute = new GPUComputationRenderer( SIZE * W_RATIO, SIZE * H_RATIO, renderer );

    var heightmapTexture = gpuCompute.createTexture();

    fillTexture( heightmapTexture );

    heightmapVariable = gpuCompute.addVariable( "heightmap", document.getElementById( 'heightmap' ).textContent, heightmapTexture );

    gpuCompute.setVariableDependencies( heightmapVariable, [ heightmapVariable ] );

    heightmapVariable.material.uniforms.mousePos = { value: new THREE.Vector2( 10000, 10000 ) };
    heightmapVariable.material.uniforms.mouseSize = { value: param_vars.mouse_size };
    heightmapVariable.material.uniforms.viscosityConstant = { value: param_vars.viscosity };
    heightmapVariable.material.uniforms.scrollTiming = { value: param_vars.scroll_timing };
    heightmapVariable.material.defines.BOUNDS_X = (BOUNDS * W_RATIO).toFixed( 2 );
    heightmapVariable.material.defines.BOUNDS_Y = (BOUNDS * H_RATIO).toFixed( 2 );

    heightmapUniforms = heightmapVariable.material.uniforms;

    var error = gpuCompute.init();
    if ( error !== null ) console.error( error );

    // Create compute shader to smooth the water surface and velocity
    smoothShader = gpuCompute.createShaderMaterial( document.getElementById( 'smooth' ).textContent, { texture: { value: null } } );
}

function createTextLines(canv,ctx,xmargin) {
    var lines = [];
    var curLine = "";
    var tokens = param_vars.water_text.split(/\s+/);
    while (tokens.length > 0) {
        do curLine += tokens.splice(0,1)[0] + " ";
        while (ctx.measureText(curLine + tokens[0]).width < canv.width - (xmargin*2) && tokens.length > 0);

        lines.push(curLine.trim());
        curLine = "";
    }
    return lines;
}

function createTextTexture() {
    //create image
    var textureCanv = document.createElement('canvas');
    textureCanv.width =  TEXTURE_SIZE * W_RATIO;
    textureCanv.height = TEXTURE_SIZE * H_RATIO;

    var textureCtx = textureCanv.getContext('2d');
    textureCtx.imageSmoothingEnabled = true;
    textureCtx.font = param_vars.font_size + "px Suisse";
    textureCtx.clearRect(0,0,textureCanv.width, textureCanv.height);
    textureCtx.fillStyle   = "white";
    textureCtx.strokeStyle = "white";
    textureCtx.textAlign   = "left";

    var lines = createTextLines(textureCanv,textureCtx,200);
    for (var i = 0; i < lines.length; i++) {
        textureCtx.fillText(lines[i], 10, (i+1)*(param_vars.font_size + param_vars.font_leading));
    }

    // canvas contents will be used for a texture
    texture = new THREE.Texture(textureCanv);
    texture.needsUpdate     = true;
    texture.minFilter       = THREE.LinearFilter;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set( 0, 0 );
    texture.repeat.set( 2, 2 );
    // texture.generateMipmaps = false;
    // texture.anisotropy      = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function fillTexture( texture ) {
    var waterMaxHeight = 10;

    function noise( x, y, z ) {
        var multR = waterMaxHeight;
        var mult = 0.025 / param_vars.nat_wave_width;
        var r = 0;
        for ( var i = 0; i < param_vars.nat_wave_ripple; i++ ) {
            r += multR * noiseFunc.noise( x * mult, y * mult, z * mult );
            multR *= 0.55 + 0.035 * i;
            mult *= 1 + (.25);
        }
        return r;
    }

    var pixels = texture.image.data;

    var p = 0;
    for ( var j = 0; j < SIZE * H_RATIO; j++ ) {
        for ( var i = 0; i < SIZE * W_RATIO; i++ ) {
            var x = i * 128 / (SIZE * W_RATIO);
            var y = j * 128 / (SIZE * H_RATIO);

            pixels[ p + 0 ] = noise( x, y, 123.4 );
            pixels[ p + 1 ] = 0;
            pixels[ p + 2 ] = 0;
            pixels[ p + 3 ] = 1;
            p += 4;
        }
    }
}

function smoothWater() {
    var currentRenderTarget = gpuCompute.getCurrentRenderTarget( heightmapVariable );
    var alternateRenderTarget = gpuCompute.getAlternateRenderTarget( heightmapVariable );

    for ( var i = 0; i < 10; i++ ) {

        smoothShader.uniforms.texture.value = currentRenderTarget.texture;
        gpuCompute.doRenderTarget( smoothShader, alternateRenderTarget );

        smoothShader.uniforms.texture.value = alternateRenderTarget.texture;
        gpuCompute.doRenderTarget( smoothShader, currentRenderTarget );

    }
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    waterUniforms.u_resolution.value.x = window.innerWidth;
    waterUniforms.u_resolution.value.y = window.innerHeight;

    camera.position.set(
        param_vars.camera_pos_x,
        param_vars.camera_pos_y * Math.pow(0.5 + (window.innerHeight/window.innerWidth),1),
        param_vars.camera_pos_z * Math.pow(0.5 + (window.innerHeight/window.innerWidth),1)
    );

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function setMouseCoords( x, y ) {
    mouseCoords.set( ( x / renderer.domElement.clientWidth ) * 2 - 1, - ( y / renderer.domElement.clientHeight ) * 2 + 1 );
    mouseMoved = true;
}

function onDocumentMouseMove( event ) {
    setMouseCoords( event.pageX, event.pageY );
}

function onDocumentTouchStart( event ) {
    if ( event.touches.length === 1 ) {
        event.preventDefault();
        setMouseCoords( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
    }
}

function onDocumentTouchMove( event ) {
    if ( event.touches.length === 1 ) {
        event.preventDefault();
        setMouseCoords( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
    }
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

var incTime = false;

function render() {
    // Set uniforms: mouse interaction
    var uniforms = heightmapVariable.material.uniforms;
    if ( mouseMoved ) {
        this.raycaster.setFromCamera( mouseCoords, camera );
        var intersects = this.raycaster.intersectObject( meshRay );

        if ( intersects.length > 0 ) {
            var point = intersects[ 0 ].point;
            uniforms.mousePos.value.set( point.x, point.z );
        }
        else uniforms.mousePos.value.set( 10000, 10000 );

        mouseMoved = false;
    }
    else uniforms.mousePos.value.set( 10000, 10000 );

    // Do the gpu computation
    gpuCompute.compute();

    // Get compute output in custom uniform
    waterUniforms.heightmap.value = gpuCompute.getCurrentRenderTarget( heightmapVariable ).texture;

    if (incTime) waterUniforms.u_time.value += 0.05;

    if (mouseIsDown) {
        timeSinceClick += 0.025;
    }
    else if (timeSinceClick > 0) {
        timeSinceClick = Math.max(0,timeSinceClick - 0.05);
    }

    // controls.update();

    // Render
    renderer.render( scene, camera );
}


initBackgroundEffect();