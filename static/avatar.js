// =================== Avatar.js ===================

// Quick nod expression
function triggerAvatarExpression() {
  if (!window.currentScene) return;
  const scene = window.currentScene;

  const head = scene.meshes.find(m => m.name.toLowerCase().includes("head"));
  if (head) {
    const anim = new BABYLON.Animation(
      "nod",
      "rotation.x",
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [];
    keys.push({ frame: 0, value: 0 });
    keys.push({ frame: 15, value: 0.1 });
    keys.push({ frame: 30, value: 0 });
    anim.setKeys(keys);

    head.animations = [anim];
    scene.beginAnimation(head, 0, 30, true);
  }
}

// Gentle head tilt idle movement
function animateHead(scene) {
  const skeleton = scene.skeletons[0];
  if (!skeleton) return;

  const headBone = skeleton.bones.find(b => b.name.toLowerCase().includes("head"));
  if (!headBone) {
    console.warn("No head bone found.");
    return;
  }

  const anim = new BABYLON.Animation(
    "headIdle",
    "rotation.y",
    30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
  );

  const keys = [];
  keys.push({ frame: 0, value: 0 });
  keys.push({ frame: 15, value: 0.1 });
  keys.push({ frame: 30, value: -0.1 });
  keys.push({ frame: 45, value: 0 });
  anim.setKeys(keys);

  headBone.animations = [anim];
  scene.beginAnimation(headBone, 0, 45, true, 0.8);
}

// Hand wave/gesture
function animateHands(scene) {
  const skeleton = scene.skeletons[0];
  if (!skeleton) return;

  const leftHand = skeleton.bones.find(b => b.name.toLowerCase().includes("lefthand"));
  const rightHand = skeleton.bones.find(b => b.name.toLowerCase().includes("righthand"));

  [leftHand, rightHand].forEach(handBone => {
    if (!handBone) return;

    const anim = new BABYLON.Animation(
      "handWave",
      "rotation.z",
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [];
    keys.push({ frame: 0, value: 0 });
    keys.push({ frame: 20, value: 0.2 });
    keys.push({ frame: 40, value: -0.2 });
    keys.push({ frame: 60, value: 0 });
    anim.setKeys(keys);

    handBone.animations = [anim];
    scene.beginAnimation(handBone, 0, 60, true, 1.0);
  });
}

// =============== Lip Sync (Approximate Phoneme-based) ===============
const phonemeVisemeMap = {
  A: "viseme_AA",
  E: "viseme_E",
  I: "viseme_I",
  O: "viseme_O",
  U: "viseme_U",
  M: "viseme_M",
  F: "viseme_F",
  S: "viseme_S"
};

function textToPhonemes(text) {
  text = text.toUpperCase();
  return text.split("").map(ch => {
    if ("AEIOU".includes(ch)) return ch;
    if ("MFV".includes(ch)) return "M";
    if ("SZ".includes(ch)) return "S";
    return "A";
  });
}

function triggerAvatarLipSync(scene, audioElement, text) {
  let morphTargetManager = null;
  scene.meshes.forEach(mesh => {
    if (mesh.morphTargetManager) morphTargetManager = mesh.morphTargetManager;
  });

  if (!morphTargetManager) return;

  const phonemes = textToPhonemes(text);
  const phonemeDuration = 120; // ms per phoneme fallback

  let index = 0;
  const interval = setInterval(() => {
    if (audioElement.paused || audioElement.ended || index >= phonemes.length) {
      for (let i = 0; i < morphTargetManager.numTargets; i++) {
        morphTargetManager.getTarget(i).influence = 0;
      }
      clearInterval(interval);
      return;
    }

    const phoneme = phonemes[index];
    const visemeName = phonemeVisemeMap[phoneme];

    for (let i = 0; i < morphTargetManager.numTargets; i++) {
      morphTargetManager.getTarget(i).influence = 0;
    }

    for (let i = 0; i < morphTargetManager.numTargets; i++) {
      const target = morphTargetManager.getTarget(i);
      if (target.name.includes(visemeName)) {
        target.influence = 1.0;
      }
    }

    index++;
  }, phonemeDuration);
}


    

// =============== Combined Speaking Action ===============
function triggerAvatarSpeaking(scene, audioElement, text) {
  triggerAvatarExpression();
  animateHead(scene);
  animateHands(scene);
  triggerAvatarLipSync(scene, audioElement, text);
}

// =============== Scene Setup ===============
window.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true);

  const createScene = async function () {
    const scene = new BABYLON.Scene(engine);

    // Light
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

    // Fixed zoom camera
    const camera = new BABYLON.UniversalCamera("Camera", new BABYLON.Vector3(0, 1.6, 1.2), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1.5, 0));
    camera.attachControl(canvas, false);

    // Load Avatar
    await BABYLON.SceneLoader.AppendAsync(
      "https://models.readyplayer.me/68b66d0788d9bef7f4b929b3.glb",
      "",
      scene
    );

    window.currentScene = scene;
    return scene;
  };

  createScene().then(function (scene) {
    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
  });
});


