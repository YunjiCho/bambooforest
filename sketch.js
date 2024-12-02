// Matter.js 설정 및 기본 물리 엔진 초기화
const Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  SAT = Matter.SAT;

const engine = Engine.create({
  gravity: { x: 0, y: 0.05 },
});

const render = Render.create({
  canvas: document.getElementById("canvas"),
  engine: engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight,
    wireframes: false,
    background: "#000000",
    pixelRatio: 1,
  },
});

const targetFPS = 30;
let lastFrameTime = 0;
const targetAPS = 60;
let lastAudioTime = 0;

// 색상 배열
const colors = [
  "#009B72",
  "#009DDB",
  "#00C2D1",
  "#3E6C51",
  "#522B29",
  "#6EB1BF",
  "#777DA7",
  "#DBE4EE",
  "#ED33B9",
  "#F17300",
  "#F39A9D",
  "#F6AF65",
  "#F9E900",
  "#FE5F54",
  "#FEEAEC",
  "#FFA69E",
];

// 각 단계별 그라데이션 생성
const gradients = [];
for (let i = 0; i < 10; i++) {
  const color1 = colors[Math.floor(Math.random() * colors.length)];
  const color2 = colors[Math.floor(Math.random() * colors.length)];
  gradients.push({ color1, color2 });
}

// 크기 단계 정의
const sizes = [
  { width: 20, height: 20 },
  { width: 30, height: 30 },
  { width: 50, height: 50 },
  { width: 60, height: 60 },
  { width: 80, height: 80 },
  { width: 70, height: 90 },
  { width: 120, height: 90 },
  { width: 110, height: 140 },
  { width: 180, height: 140 },
  { width: 170, height: 220 },
];

// 도형 관리 배열 생성
let shapes = [];

let mytext = "윤띠";
let sizeRatio = 0.3;
let lineHeightRatio = 0.3;
let minStackHeight = window.innerHeight;
let currentfrequency = 0;

//이미지 배열 생성
const setnum = 6; //이미지 세트 개수
let currentset = setnum; //현재 사용하고자 하는 이미지 세트 번호
let settext = "freq";
let images = new Array(setnum);
for (let i = 0; i < setnum; i++) {
  images[i] = new Array(10);
  for (let j = 0; j < 10; j++) {
    images[i][j] = new Image();
    images[i][j].src = "set" + (i + 1) + "_" + (j + 1) + ".png";
  }
}

let minvolume = 5; //음량 최대/최솟값 설정
let maxvolume = 80;
let currentvolume;
let minfrequency = 100; //주파수 최대/최솟값 설정
let maxfrequency = 2000;
let currentfreqency;
let freqarray = new Array(60).fill(0);

let currentPosition = null;
let lastSoundTime = 0;
const soundTimeout = 500;

// 새로운 위치 선택 함수 수정 - 더 넓은 영역
function selectNewPosition() {
  return {
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 0.7 * window.innerWidth,
    y: window.innerHeight / 3 + (Math.random() - 0.5) * 0.2 * window.innerHeight,
  };
}

let wall2 = null;
// 대나무 숲 벽면 생성
function createBambooForest() {
  const wallThickness = 20;
  const walls = [
    Bodies.rectangle(
      0,
      window.innerHeight / 2,
      wallThickness,
      window.innerHeight,
      { isStatic: true }
    ),
    Bodies.rectangle(
      window.innerWidth,
      window.innerHeight / 2,
      wallThickness,
      window.innerHeight,
      { isStatic: true }
    ),
    Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight,
      window.innerWidth,
      wallThickness,
      { isStatic: true }
    ),
    Bodies.rectangle(
      window.innerWidth / 2,
      0,
      window.innerWidth,
      wallThickness,
      { isStatic: true }
    ),
  ];

  walls.forEach((wall) => {
    wall.render.fillStyle = "#000000";
    wall.render.strokeStyle = "#000000";
  });

  World.add(engine.world, walls);
  wall2 = walls[2];
}

// 유틸리티 함수
Math.map = (value, in_min, in_max, out_min, out_max) => {
  return ((value - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
};

// 수정된 로그 매핑 함수
function logFrequencyMapping(frequency, minFreq, maxFreq, setCount) {
  // 주파수가 유효하지 않은 경우 기본값 반환
  if (!frequency || frequency <= 0 || isNaN(frequency)) {
    return setCount - 1; // 가장 낮은 소리에 해당하는 이미지 세트 반환
  }

  // 주파수 범위 제한
  frequency = Math.max(minFreq, Math.min(maxFreq, frequency));

  const minLog = Math.log(minFreq);
  const maxLog = Math.log(maxFreq);
  const frequencyLog = Math.log(frequency);

  const position = (frequencyLog - minLog) / (maxLog - minLog);
  // 범위를 0~1로 제한
  const normalizedPosition = Math.max(0, Math.min(1, position));
  // 순서를 반전시킴 (높은 주파수 = 낮은 이미지 세트 번호)
  return Math.min(
    Math.floor((1 - normalizedPosition) * setCount),
    setCount - 1
  );
}

const rotationSpeeds = [
  // set1 (회전 없음)
  [0, 0, 0, 0, 0, 0, 0, Math.PI / 3, 0, 0],
  // set2 (회전 없음)
  [0, 0, 0, 0, 0, 0, 0, 0, Math.PI / 3, 0],
  // set3 (크기별 다른 회전 속도)
  [
    0,
    0,
    Math.PI / 3, // 1~3 크기: 60도/초
    0,
    Math.PI / 4,
    0, // 4~6 크기: 45도/초
    0,
    Math.PI / 6,
    0,
    Math.PI / 6,
  ], // 7~10 크기: 30도/초
  // set4 (크기별 다른 회전 속도)
  [
    0,
    0,
    Math.PI / 3, // 1~3 크기: 60도/초
    0,
    Math.PI / 4,
    Math.PI / 4, // 4~6 크기: 45도/초
    0,
    Math.PI / 6,
    0,
    0,
  ], // 7~10 크기: 30도/초
  // set5 (회전 없음)
  [0, 0, 0, 0, 0, 0, 0, Math.PI / 6, 0, 0],
  // set6 (회전 없음)
  [0, 0, 0, 0, Math.PI / 6, 0, 0, 0, 0, 0],
];

// 도형 생성 함수
function createShape(volume, frequency) {
  const currentTime = Date.now();

  if (currentTime - lastSoundTime > soundTimeout || !currentPosition) {
    currentPosition = selectNewPosition();
    freqarray = new Array(60).fill(frequency);
  }
  freqarray.pop();
  freqarray.unshift(frequency);
  let meanfreq = freqarray.reduce((a, b) => a + b) / freqarray.length;

  lastSoundTime = currentTime;

  const sizeIndex = Math.min(
    Math.floor(Math.map(volume, minvolume, maxvolume, 0, 9)),
    9
  );
  const size = {
    width: sizes[sizeIndex].width * sizeRatio,
    height: sizes[sizeIndex].height * sizeRatio,
  };

  const randomAngle = Math.random() * Math.PI * 0.2 + Math.PI * 1.4;

  // 400x100 영역 내에서 랜덤하게 위치 선택
  const areaWidth = 400;
  const areaHeight = 100;
  const randomX = (Math.random() - 0.5) * areaWidth;
  const randomY = (Math.random() - 0.5) * areaHeight;
  
  const x = currentPosition.x + randomX;
  const y = currentPosition.y + randomY;

  let imgset = currentset;
  if (imgset === setnum) {
    imgset = logFrequencyMapping(meanfreq, minfrequency, maxfrequency, setnum);
  } else {
    imgset = currentset - 1;
  }

  const shape = Bodies.rectangle(x, y, size.width, size.height, {
    render: {
      sprite: {
        texture: images[imgset][sizeIndex].src,
        xScale: size.width / images[imgset][sizeIndex].width,
        yScale: size.height / images[imgset][sizeIndex].height,
      },
    },
    frictionAir: 0.001,  // 공기 저항 감소
    friction: 0,
    restitution: 0.7,    // 탄성 계수
  });

  shape.randomAngle = randomAngle;
  World.add(engine.world, shape);
  shapes.push(shape);

  // 회전 속도 설정
  const rotationSpeed = rotationSpeeds[imgset][sizeIndex];
  if (rotationSpeed !== 0) {
    Body.setAngularVelocity(shape, rotationSpeed);
  }

  // 초기 속도 설정 - 기존 방향에 랜덤성 추가
  const speedMultiplier = 2;
  const randomSpeedX = (Math.random() - 0.5) * speedMultiplier;
  Body.setVelocity(shape, {
    x: Math.cos(shape.randomAngle) * speedMultiplier + randomSpeedX,
    y: Math.sin(shape.randomAngle) * speedMultiplier
  });
}
// 음성 입력 설정
// Matter.js 설정 부분은 동일하게 유지...

function setupAudio() {
  const targetDeviceId = "bba86ce0bc19ef070d05da8c12d59f86f1ca0a7a7b8890eb17bb0d6132abfa93";

  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      console.log('사용 가능한 오디오 장치들:', audioDevices);

      // 먼저 지정된 디바이스가 있는지 확인
      const targetDevice = audioDevices.find(device => device.deviceId === targetDeviceId);
      
      const constraints = {
        audio: {
          // 지정된 디바이스가 있으면 해당 디바이스 사용, 없으면 기본 디바이스 사용
          ...(targetDevice ? { deviceId: { exact: targetDeviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      };

      return navigator.mediaDevices.getUserMedia(constraints);
    })
    .then((stream) => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      // 노이즈 게이트 추가
      const noiseGate = audioContext.createDynamicsCompressor();
      noiseGate.threshold.value = -50;
      noiseGate.knee.value = 40;
      noiseGate.ratio.value = 12;
      noiseGate.attack.value = 0;
      noiseGate.release.value = 0.25;

      // 주파수 필터 추가
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.5;

      // 오디오 처리 체인 연결
      source.connect(filter);
      filter.connect(noiseGate);
      noiseGate.connect(analyser);

      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function analyze(time) {
        const elapsed = time - lastAudioTime;
        if (elapsed >= 1000 / targetAPS) {
          analyser.getByteFrequencyData(dataArray);

          const volume = dataArray.reduce((a, b) => a + b) / bufferLength;
          currentvolume = volume;

          const frequencyData = dataArray.slice(0, bufferLength);
          const maxFrequencyIndex = frequencyData.indexOf(
            Math.max(...frequencyData)
          );
          const frequency =
            (maxFrequencyIndex * (audioContext.sampleRate / 2)) / bufferLength;

          if (frequency > 0 && frequency <= 4000 && !isNaN(frequency)) {
            currentfrequency = frequency;
            
            if (volume > minvolume) {
              createShape(volume, currentfrequency);
            }
          }

          lastAudioTime = time - (elapsed % (1000 / targetAPS));
        }

        requestAnimationFrame(analyze);
      }
      analyze();
    })
    .catch((err) => {
      console.error("마이크 접근 오류:", err);
      if (err.name === 'NotFoundError') {
        alert("지정된 마이크를 찾을 수 없습니다. 기본 마이크를 사용하려면 페이지를 새로고침 해주세요.");
      } else {
        alert("마이크 접근 권한이 필요합니다. 브라우저의 권한 설정을 확인해주세요.");
      }
    });
}
// 바닥에 닿은 도형 제거
function removeBottomShapes() {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (!(wall2 === null) && !(SAT.collides(wall2, shapes[i]) === null)) {
      World.remove(engine.world, shapes[i]);
      shapes.splice(i, 1);
    }
  }
}

// 도형 상태 업데이트 및 제거
function draw() {
  minStackHeight = window.innerHeight;
  let maxStackIndex = -1;
  let indexOut = [];

  for (let i = 0; i < shapes.length; i++) {
    if (
      shapes[i].position.y > window.innerHeight + 10 ||
      shapes[i].position.y < 0
    ) {
      indexOut.push(i);
    } else if (
      shapes[i].velocity.x * shapes[i].velocity.x +
        shapes[i].velocity.y * shapes[i].velocity.y <
      0.0001
    ) {
      if (minStackHeight > shapes[i].position.y) {
        minStackHeight = shapes[i].position.y;
      } else if (
        maxStackIndex < 0 ||
        shapes[maxStackIndex].position.y < shapes[i].position.y
      ) {
        maxStackIndex = i;
      }
    }
  }

  mytext =
    "Volume : " +
    Math.round(currentvolume) +
    ", Frequency : " +
    Math.round(currentfrequency);

  if (
    maxStackIndex >= 0 &&
    minStackHeight < (1 - lineHeightRatio) * window.innerHeight
  ) {
    indexOut.push(maxStackIndex);
  }

  if (indexOut.length > 0) {
    indexOut.sort((a, b) => b - a);
    for (let i = 0; i < indexOut.length; i++) {
      World.remove(engine.world, shapes[indexOut[i]]);
      shapes.splice(indexOut[i], 1);
    }
  }

  if (minStackHeight < (1 - lineHeightRatio) * window.innerHeight) {
    removeBottomShapes();
  }
}

// 메인 setup 함수
function setup() {
  createBambooForest();
  setupAudio();

  function animate(time) {
    const elapsed = time - lastFrameTime;
    if (elapsed >= 1000 / targetFPS) {
      Engine.update(engine, elapsed / 2);
      Render.world(render);
      lastFrameTime = time - (elapsed % (1000 / targetFPS));
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// 주기적인 상태 업데이트
setInterval(draw, 5);

// 페이지 로드 시 setup 실행
window.onload = setup;
