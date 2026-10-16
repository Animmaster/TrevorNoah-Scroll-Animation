export const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uTexture;
  uniform vec2 uImageSize;
  uniform vec2 uPlaneSize;
  uniform vec2 uPad;
  uniform float uProgress;

  const float PI = 3.141592653589793;

  const float minAmount = -0.15;
  const float maxAmount = 1.25;

  const float scale = 500.0;
  const float sharpness = 3.0;

  const float cylinderRadius = 1.0 / PI / 2.0;

  float amount;
  float cylinderCenter;
  float cylinderAngle;

  bool inRect(vec2 uv) {
    return uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;
  }

  vec2 coverUv(vec2 uv) {
    float planeAspect = uPlaneSize.x / uPlaneSize.y;
    float imageAspect = uImageSize.x / uImageSize.y;
    vec2 s = vec2(1.0);
    if (planeAspect > imageAspect) s.y = imageAspect / planeAspect;
    else s.x = planeAspect / imageAspect;
    return (uv - 0.5) * s + 0.5;
  }

  vec4 getImage(vec2 uv) {
    return texture2D(uTexture, coverUv(uv));
  }

  vec4 transparent() {
    return vec4(0.0);
  }

  vec3 hitPoint(float hitAngle, vec3 point, mat3 backRotation) {
    point.y = hitAngle / (2.0 * PI);
    return backRotation * point;
  }

  vec4 antiAlias(vec4 colorA, vec4 colorB, float distance) {
    distance *= scale;
    if (distance < 0.0) return colorB;
    if (distance > 2.0) return colorA;
    float d = pow(1.0 - distance / 2.0, sharpness);
    return (colorB - colorA) * d + colorA;
  }

  float distanceToEdge(vec3 point) {
    float dx = abs(point.x > 0.5 ? 1.0 - point.x : point.x);
    float dy = abs(point.y > 0.5 ? 1.0 - point.y : point.y);
    if (point.x < 0.0) dx = -point.x;
    if (point.x > 1.0) dx = point.x - 1.0;
    if (point.y < 0.0) dy = -point.y;
    if (point.y > 1.0) dy = point.y - 1.0;
    if ((point.x < 0.0 || point.x > 1.0) && (point.y < 0.0 || point.y > 1.0))
      return sqrt(dx * dx + dy * dy);
    return min(dx, dy);
  }

  vec4 seeThrough(float yc, vec2 uv, mat3 rotation, mat3 backRotation) {
    float hitAngle = PI - (acos(yc / cylinderRadius) - cylinderAngle);
    vec3 point = hitPoint(hitAngle, rotation * vec3(uv, 1.0), backRotation);

    if (yc <= 0.0 && !inRect(point.xy)) return transparent();
    if (yc > 0.0) return inRect(uv) ? getImage(uv) : transparent();

    vec4 color = getImage(point.xy);
    return antiAlias(color, transparent(), distanceToEdge(point));
  }

  vec4 seeThroughWithShadow(float yc, vec2 uv, vec3 point, mat3 rotation, mat3 backRotation) {
    float shadow = distanceToEdge(point) * 30.0;
    shadow = (1.0 - shadow) / 3.0;
    shadow = max(shadow, 0.0) * amount;

    vec4 color = seeThrough(yc, uv, rotation, backRotation);
    return color;
  }

  vec4 backside(float yc) {
    float lit = pow(1.0 - abs(yc / cylinderRadius), 0.2) / 2.0 + 0.5;
    float gray = 0.82 + 0.18 * lit;
    return vec4(vec3(gray), 1.0);
  }

  void main() {
    vec2 uv = (vUv - uPad) / (1.0 - 2.0 * uPad);

    amount = uProgress * (maxAmount - minAmount) + minAmount;
    cylinderCenter = amount;
    cylinderAngle = 2.0 * PI * amount;

    const float angle = 30.0 * PI / 180.0;
    float c = cos(-angle);
    float s = sin(-angle);
    mat3 rotation = mat3(c, s, 0.0, -s, c, 0.0, 0.12, 0.258, 1.0);
    c = cos(angle);
    s = sin(angle);
    mat3 backRotation = mat3(c, s, 0.0, -s, c, 0.0, 0.15, -0.5, 1.0);

    vec3 point = rotation * vec3(uv, 1.0);
    float yc = point.y - cylinderCenter;

    vec4 color;

    if (yc < -cylinderRadius) {
      color = transparent();
    } else if (yc > cylinderRadius) {
      color = inRect(uv) ? getImage(uv) : transparent();
    } else {
      float hitAngle = (acos(yc / cylinderRadius) + cylinderAngle) - PI;
      float hitAngleMod = mod(hitAngle, 2.0 * PI);

      if ((hitAngleMod > PI && amount < 0.5) || (hitAngleMod > PI / 2.0 && amount < 0.0)) {
        color = seeThrough(yc, uv, rotation, backRotation);
      } else {
        point = hitPoint(hitAngle, point, backRotation);

        if (!inRect(point.xy)) {
          color = seeThroughWithShadow(yc, uv, point, rotation, backRotation);
        } else {
          vec4 paper = backside(yc);
          vec4 below;
          if (yc < 0.0) {
            float shade = 1.0 - length(point.xy - 0.5) / 0.71;
            shade *= pow(-yc / cylinderRadius, 3.0) * 0.2;
            below = vec4(0.0, 0.0, 0.0, shade);
          } else {
            below = inRect(uv) ? getImage(uv) : transparent();
          }
          color = antiAlias(paper, below, cylinderRadius - abs(yc));
        }
      }
    }

    if (color.a <= 0.0) discard;
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;
