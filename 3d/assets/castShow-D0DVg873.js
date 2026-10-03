var eh=Object.defineProperty;var nh=(i,t,e)=>t in i?eh(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e;var q=(i,t,e)=>nh(i,typeof t!="symbol"?t+"":t,e);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Wg=2;const Xg=2;const $g=7;const qg=1e3;const Ue="srgb",Zs="srgb-linear",Qs="linear",ee="srgb";const oo="300 es";function ih(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function ns(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function sh(){const i=ns("canvas");return i.style.display="block",i}const lo={};function js(...i){const t="THREE."+i.shift();console.log(t,...i)}function $l(i){const t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){const e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Dt(...i){i=$l(i);const t="THREE."+i.shift();{const e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Yt(...i){i=$l(i);const t="THREE."+i.shift();{const e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function Pi(...i){const t=i.join(" ");t in lo||(lo[t]=!0,Dt(...i))}function rh(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}const ah={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3};class ni{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){const n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){const n=this._listeners;if(n===void 0)return;const s=n[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const n=e[t.type];if(n!==void 0){t.target=this;const s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,t);t.target=null}}}const ke=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],gr=Math.PI/180,oa=180/Math.PI;function Xn(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(ke[i&255]+ke[i>>8&255]+ke[i>>16&255]+ke[i>>24&255]+"-"+ke[t&255]+ke[t>>8&255]+"-"+ke[t>>16&15|64]+ke[t>>24&255]+"-"+ke[e&63|128]+ke[e>>8&255]+"-"+ke[e>>16&255]+ke[e>>24&255]+ke[n&255]+ke[n>>8&255]+ke[n>>16&255]+ke[n>>24&255]).toLowerCase()}function Ht(i,t,e){return Math.max(t,Math.min(e,i))}function oh(i,t){return(i%t+t)%t}function _r(i,t,e){return(1-e)*i+e*t}function Mn(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function ae(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const $a=class $a{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Ht(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,a=this.y-t.y;return this.x=r*n-a*s+t.x,this.y=r*s+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};$a.prototype.isVector2=!0;let ut=$a;class Ni{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,a,o){let l=n[s+0],c=n[s+1],h=n[s+2],u=n[s+3],d=r[a+0],p=r[a+1],g=r[a+2],_=r[a+3];if(u!==_||l!==d||c!==p||h!==g){let m=l*d+c*p+h*g+u*_;m<0&&(d=-d,p=-p,g=-g,_=-_,m=-m);let f=1-o;if(m<.9995){const v=Math.acos(m),T=Math.sin(v);f=Math.sin(f*v)/T,o=Math.sin(o*v)/T,l=l*f+d*o,c=c*f+p*o,h=h*f+g*o,u=u*f+_*o}else{l=l*f+d*o,c=c*f+p*o,h=h*f+g*o,u=u*f+_*o;const v=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=v,c*=v,h*=v,u*=v}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,s,r,a){const o=n[s],l=n[s+1],c=n[s+2],h=n[s+3],u=r[a],d=r[a+1],p=r[a+2],g=r[a+3];return t[e]=o*g+h*u+l*p-c*d,t[e+1]=l*g+h*d+c*u-o*p,t[e+2]=c*g+h*p+o*d-l*u,t[e+3]=h*g-o*u-l*d-c*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,s=t._y,r=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(s/2),u=o(r/2),d=l(n/2),p=l(s/2),g=l(r/2);switch(a){case"XYZ":this._x=d*h*u+c*p*g,this._y=c*p*u-d*h*g,this._z=c*h*g+d*p*u,this._w=c*h*u-d*p*g;break;case"YXZ":this._x=d*h*u+c*p*g,this._y=c*p*u-d*h*g,this._z=c*h*g-d*p*u,this._w=c*h*u+d*p*g;break;case"ZXY":this._x=d*h*u-c*p*g,this._y=c*p*u+d*h*g,this._z=c*h*g+d*p*u,this._w=c*h*u-d*p*g;break;case"ZYX":this._x=d*h*u-c*p*g,this._y=c*p*u+d*h*g,this._z=c*h*g-d*p*u,this._w=c*h*u+d*p*g;break;case"YZX":this._x=d*h*u+c*p*g,this._y=c*p*u+d*h*g,this._z=c*h*g-d*p*u,this._w=c*h*u-d*p*g;break;case"XZY":this._x=d*h*u-c*p*g,this._y=c*p*u-d*h*g,this._z=c*h*g+d*p*u,this._w=c*h*u+d*p*g;break;default:Dt("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],s=e[4],r=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=n+o+u;if(d>0){const p=.5/Math.sqrt(d+1);this._w=.25/p,this._x=(h-l)*p,this._y=(r-c)*p,this._z=(a-s)*p}else if(n>o&&n>u){const p=2*Math.sqrt(1+n-o-u);this._w=(h-l)/p,this._x=.25*p,this._y=(s+a)/p,this._z=(r+c)/p}else if(o>u){const p=2*Math.sqrt(1+o-n-u);this._w=(r-c)/p,this._x=(s+a)/p,this._y=.25*p,this._z=(l+h)/p}else{const p=2*Math.sqrt(1+u-n-o);this._w=(a-s)/p,this._x=(r+c)/p,this._y=(l+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ht(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,s=t._y,r=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+s*c-r*l,this._y=s*h+a*l+r*o-n*c,this._z=r*h+a*c+n*l-s*o,this._w=a*h-n*o-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,a=t._w,o=this.dot(t);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let l=1-e;if(o<.9995){const c=Math.acos(o),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+a*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const qa=class qa{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(co.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(co.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=t.elements,a=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(t){const e=this.x,n=this.y,s=this.z,r=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*s-o*n),h=2*(o*e-r*s),u=2*(r*n-a*e);return this.x=e+l*c+a*u-o*h,this.y=n+l*h+o*c-r*u,this.z=s+l*u+r*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this.z=Ht(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this.z=Ht(this.z,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,s=t.y,r=t.z,a=e.x,o=e.y,l=e.z;return this.x=s*l-r*o,this.y=r*a-n*l,this.z=n*o-s*a,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return vr.copy(this).projectOnVector(t),this.sub(vr)}reflect(t){return this.sub(vr.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Ht(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};qa.prototype.isVector3=!0;let D=qa;const vr=new D,co=new Ni,Ya=class Ya{constructor(t,e,n,s,r,a,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c)}set(t,e,n,s,r,a,o,l,c){const h=this.elements;return h[0]=t,h[1]=s,h[2]=o,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],p=n[5],g=n[8],_=s[0],m=s[3],f=s[6],v=s[1],T=s[4],S=s[7],E=s[2],y=s[5],R=s[8];return r[0]=a*_+o*v+l*E,r[3]=a*m+o*T+l*y,r[6]=a*f+o*S+l*R,r[1]=c*_+h*v+u*E,r[4]=c*m+h*T+u*y,r[7]=c*f+h*S+u*R,r[2]=d*_+p*v+g*E,r[5]=d*m+p*T+g*y,r[8]=d*f+p*S+g*R,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*r*h+n*o*l+s*r*c-s*a*l}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],u=h*a-o*c,d=o*l-h*r,p=c*r-a*l,g=e*u+n*d+s*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return t[0]=u*_,t[1]=(s*c-h*n)*_,t[2]=(o*n-s*a)*_,t[3]=d*_,t[4]=(h*e-s*l)*_,t[5]=(s*r-o*e)*_,t[6]=p*_,t[7]=(n*l-c*e)*_,t[8]=(a*e-n*r)*_,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,a,o){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-s*c,s*l,-s*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return Pi("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(xr.makeScale(t,e)),this}rotate(t){return Pi("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(xr.makeRotation(-t)),this}translate(t,e){return Pi("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(xr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};Ya.prototype.isMatrix3=!0;let Ft=Ya;const xr=new Ft,ho=new Ft().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),uo=new Ft().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function lh(){const i={enabled:!0,workingColorSpace:Zs,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===ee&&(s.r=Rn(s.r),s.g=Rn(s.g),s.b=Rn(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===ee&&(s.r=Li(s.r),s.g=Li(s.g),s.b=Li(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===""?Qs:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Pi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Pi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Zs]:{primaries:t,whitePoint:n,transfer:Qs,toXYZ:ho,fromXYZ:uo,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:Ue},outputColorSpaceConfig:{drawingBufferColorSpace:Ue}},[Ue]:{primaries:t,whitePoint:n,transfer:ee,toXYZ:ho,fromXYZ:uo,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:Ue}}}),i}const $t=lh();function Rn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Li(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let ai;class ch{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{ai===void 0&&(ai=ns("canvas")),ai.width=t.width,ai.height=t.height;const s=ai.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=ai}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=ns("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=Rn(r[a]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Rn(e[n]/255)*255):e[n]=Rn(e[n]);return{data:e,width:t.width,height:t.height}}else return Dt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let hh=0;class Ea{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:hh++}),this.uuid=Xn(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(Mr(s[a].image)):r.push(Mr(s[a]))}else r=Mr(s);n.url=r}return e||(t.images[this.uuid]=n),n}}function Mr(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?ch.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Dt("Texture: Unable to serialize Texture."),{})}let uh=0;const Sr=new D;class Ne extends ni{constructor(t=Ne.DEFAULT_IMAGE,e=Ne.DEFAULT_MAPPING,n=1001,s=1001,r=1006,a=1008,o=1023,l=1009,c=Ne.DEFAULT_ANISOTROPY,h=""){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:uh++}),this.uuid=Xn(),this.name="",this.source=new Ea(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new ut(0,0),this.repeat=new ut(1,1),this.center=new ut(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ft,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Sr).x}get height(){return this.source.getSize(Sr).y}get depth(){return this.source.getSize(Sr).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const e in t){const n=t[e];if(n===void 0){Dt(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Dt(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==300)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case 1e3:t.x=t.x-Math.floor(t.x);break;case 1001:t.x=t.x<0?0:1;break;case 1002:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case 1e3:t.y=t.y-Math.floor(t.y);break;case 1001:t.y=t.y<0?0:1;break;case 1002:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Ne.DEFAULT_IMAGE=null;Ne.DEFAULT_MAPPING=300;Ne.DEFAULT_ANISOTROPY=1;const Ka=class Ka{constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*e+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*e+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*e+a[7]*n+a[11]*s+a[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r;const l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],p=l[5],g=l[9],_=l[2],m=l[6],f=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+_)<.1&&Math.abs(g+m)<.1&&Math.abs(c+p+f-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const T=(c+1)/2,S=(p+1)/2,E=(f+1)/2,y=(h+d)/4,R=(u+_)/4,x=(g+m)/4;return T>S&&T>E?T<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(T),s=y/n,r=R/n):S>E?S<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(S),n=y/s,r=x/s):E<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(E),n=R/r,s=x/r),this.set(n,s,r,e),this}let v=Math.sqrt((m-g)*(m-g)+(u-_)*(u-_)+(d-h)*(d-h));return Math.abs(v)<.001&&(v=1),this.x=(m-g)/v,this.y=(u-_)/v,this.z=(d-h)/v,this.w=Math.acos((c+p+f-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Ht(this.x,t.x,e.x),this.y=Ht(this.y,t.y,e.y),this.z=Ht(this.z,t.z,e.z),this.w=Ht(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Ht(this.x,t,e),this.y=Ht(this.y,t,e),this.z=Ht(this.z,t,e),this.w=Ht(this.w,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ht(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Ka.prototype.isVector4=!0;let pe=Ka;class dh extends ni{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new pe(0,0,t,e),this.scissorTest=!1,this.viewport=new pe(0,0,t,e),this.textures=[];const s={width:t,height:e,depth:n.depth},r=new Ne(s),a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){const e={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ea(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){const e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class We extends dh{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class ql extends Ne{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class fh extends Ne{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}}const ar=class ar{constructor(t,e,n,s,r,a,o,l,c,h,u,d,p,g,_,m){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,a,o,l,c,h,u,d,p,g,_,m)}set(t,e,n,s,r,a,o,l,c,h,u,d,p,g,_,m){const f=this.elements;return f[0]=t,f[4]=e,f[8]=n,f[12]=s,f[1]=r,f[5]=a,f[9]=o,f[13]=l,f[2]=c,f[6]=h,f[10]=u,f[14]=d,f[3]=p,f[7]=g,f[11]=_,f[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ar().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();const e=this.elements,n=t.elements,s=1/oi.setFromMatrixColumn(t,0).length(),r=1/oi.setFromMatrixColumn(t,1).length(),a=1/oi.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,s=t.y,r=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){const d=a*h,p=a*u,g=o*h,_=o*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=p+g*c,e[5]=d-_*c,e[9]=-o*l,e[2]=_-d*c,e[6]=g+p*c,e[10]=a*l}else if(t.order==="YXZ"){const d=l*h,p=l*u,g=c*h,_=c*u;e[0]=d+_*o,e[4]=g*o-p,e[8]=a*c,e[1]=a*u,e[5]=a*h,e[9]=-o,e[2]=p*o-g,e[6]=_+d*o,e[10]=a*l}else if(t.order==="ZXY"){const d=l*h,p=l*u,g=c*h,_=c*u;e[0]=d-_*o,e[4]=-a*u,e[8]=g+p*o,e[1]=p+g*o,e[5]=a*h,e[9]=_-d*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){const d=a*h,p=a*u,g=o*h,_=o*u;e[0]=l*h,e[4]=g*c-p,e[8]=d*c+_,e[1]=l*u,e[5]=_*c+d,e[9]=p*c-g,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){const d=a*l,p=a*c,g=o*l,_=o*c;e[0]=l*h,e[4]=_-d*u,e[8]=g*u+p,e[1]=u,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=p*u+g,e[10]=d-_*u}else if(t.order==="XZY"){const d=a*l,p=a*c,g=o*l,_=o*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+_,e[5]=a*h,e[9]=p*u-g,e[2]=g*u-p,e[6]=o*h,e[10]=_*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(ph,t,mh)}lookAt(t,e,n){const s=this.elements;return Ye.subVectors(t,e),Ye.lengthSq()===0&&(Ye.z=1),Ye.normalize(),On.crossVectors(n,Ye),On.lengthSq()===0&&(Math.abs(n.z)===1?Ye.x+=1e-4:Ye.z+=1e-4,Ye.normalize(),On.crossVectors(n,Ye)),On.normalize(),ms.crossVectors(Ye,On),s[0]=On.x,s[4]=ms.x,s[8]=Ye.x,s[1]=On.y,s[5]=ms.y,s[9]=Ye.y,s[2]=On.z,s[6]=ms.z,s[10]=Ye.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],p=n[13],g=n[2],_=n[6],m=n[10],f=n[14],v=n[3],T=n[7],S=n[11],E=n[15],y=s[0],R=s[4],x=s[8],w=s[12],C=s[1],I=s[5],A=s[9],U=s[13],L=s[2],k=s[6],$=s[10],H=s[14],j=s[3],X=s[7],tt=s[11],et=s[15];return r[0]=a*y+o*C+l*L+c*j,r[4]=a*R+o*I+l*k+c*X,r[8]=a*x+o*A+l*$+c*tt,r[12]=a*w+o*U+l*H+c*et,r[1]=h*y+u*C+d*L+p*j,r[5]=h*R+u*I+d*k+p*X,r[9]=h*x+u*A+d*$+p*tt,r[13]=h*w+u*U+d*H+p*et,r[2]=g*y+_*C+m*L+f*j,r[6]=g*R+_*I+m*k+f*X,r[10]=g*x+_*A+m*$+f*tt,r[14]=g*w+_*U+m*H+f*et,r[3]=v*y+T*C+S*L+E*j,r[7]=v*R+T*I+S*k+E*X,r[11]=v*x+T*A+S*$+E*tt,r[15]=v*w+T*U+S*H+E*et,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],p=t[14],g=t[3],_=t[7],m=t[11],f=t[15],v=l*p-c*d,T=o*p-c*u,S=o*d-l*u,E=a*p-c*h,y=a*d-l*h,R=a*u-o*h;return e*(_*v-m*T+f*S)-n*(g*v-m*E+f*y)+s*(g*T-_*E+f*R)-r*(g*S-_*y+m*R)}determinantAffine(){const t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],a=t[5],o=t[9],l=t[2],c=t[6],h=t[10];return e*(a*h-o*c)-n*(r*h-o*l)+s*(r*c-a*l)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],p=t[11],g=t[12],_=t[13],m=t[14],f=t[15],v=e*o-n*a,T=e*l-s*a,S=e*c-r*a,E=n*l-s*o,y=n*c-r*o,R=s*c-r*l,x=h*_-u*g,w=h*m-d*g,C=h*f-p*g,I=u*m-d*_,A=u*f-p*_,U=d*f-p*m,L=v*U-T*A+S*I+E*C-y*w+R*x;if(L===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const k=1/L;return t[0]=(o*U-l*A+c*I)*k,t[1]=(s*A-n*U-r*I)*k,t[2]=(_*R-m*y+f*E)*k,t[3]=(d*y-u*R-p*E)*k,t[4]=(l*C-a*U-c*w)*k,t[5]=(e*U-s*C+r*w)*k,t[6]=(m*S-g*R-f*T)*k,t[7]=(h*R-d*S+p*T)*k,t[8]=(a*A-o*C+c*x)*k,t[9]=(n*C-e*A-r*x)*k,t[10]=(g*y-_*S+f*v)*k,t[11]=(u*S-h*y-p*v)*k,t[12]=(o*w-a*I-l*x)*k,t[13]=(e*I-n*w+s*x)*k,t[14]=(_*T-g*E-m*v)*k,t[15]=(h*E-u*T+d*v)*k,this}scale(t){const e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),s=Math.sin(e),r=1-n,a=t.x,o=t.y,l=t.z,c=r*a,h=r*o;return this.set(c*a+n,c*o-s*l,c*l+s*o,0,c*o+s*l,h*o+n,h*l-s*a,0,c*l-s*o,h*l+s*a,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,a){return this.set(1,n,r,0,t,1,a,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){const s=this.elements,r=e._x,a=e._y,o=e._z,l=e._w,c=r+r,h=a+a,u=o+o,d=r*c,p=r*h,g=r*u,_=a*h,m=a*u,f=o*u,v=l*c,T=l*h,S=l*u,E=n.x,y=n.y,R=n.z;return s[0]=(1-(_+f))*E,s[1]=(p+S)*E,s[2]=(g-T)*E,s[3]=0,s[4]=(p-S)*y,s[5]=(1-(d+f))*y,s[6]=(m+v)*y,s[7]=0,s[8]=(g+T)*R,s[9]=(m-v)*R,s[10]=(1-(d+_))*R,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){const s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];const r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let a=oi.set(s[0],s[1],s[2]).length();const o=oi.set(s[4],s[5],s[6]).length(),l=oi.set(s[8],s[9],s[10]).length();r<0&&(a=-a),on.copy(this);const c=1/a,h=1/o,u=1/l;return on.elements[0]*=c,on.elements[1]*=c,on.elements[2]*=c,on.elements[4]*=h,on.elements[5]*=h,on.elements[6]*=h,on.elements[8]*=u,on.elements[9]*=u,on.elements[10]*=u,e.setFromRotationMatrix(on),n.x=a,n.y=o,n.z=l,this}makePerspective(t,e,n,s,r,a,o=2e3,l=!1){const c=this.elements,h=2*r/(e-t),u=2*r/(n-s),d=(e+t)/(e-t),p=(n+s)/(n-s);let g,_;if(l)g=r/(a-r),_=a*r/(a-r);else if(o===2e3)g=-(a+r)/(a-r),_=-2*a*r/(a-r);else if(o===2001)g=-a/(a-r),_=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,a,o=2e3,l=!1){const c=this.elements,h=2/(e-t),u=2/(n-s),d=-(e+t)/(e-t),p=-(n+s)/(n-s);let g,_;if(l)g=1/(a-r),_=a/(a-r);else if(o===2e3)g=-2/(a-r),_=-(a+r)/(a-r);else if(o===2001)g=-1/(a-r),_=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=p,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};ar.prototype.isMatrix4=!0;let se=ar;const oi=new D,on=new se,ph=new D(0,0,0),mh=new D(1,1,1),On=new D,ms=new D,Ye=new D,fo=new se,po=new Ni;class Pn{constructor(t=0,e=0,n=0,s=Pn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const s=t.elements,r=s[0],a=s[4],o=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],p=s[10];switch(e){case"XYZ":this._y=Math.asin(Ht(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,p),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ht(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ht(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,p),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ht(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,p),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ht(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-Ht(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,p),this._y=0);break;default:Dt("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return fo.makeRotationFromQuaternion(t),this.setFromRotationMatrix(fo,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return po.setFromEuler(this),this.setFromQuaternion(po,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Pn.DEFAULT_ORDER="XYZ";class wa{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let gh=0;const mo=new D,li=new Ni,bn=new se,gs=new D,Bi=new D,_h=new D,vh=new Ni,go=new D(1,0,0),_o=new D(0,1,0),vo=new D(0,0,1),xo={type:"added"},xh={type:"removed"},ci={type:"childadded",child:null},yr={type:"childremoved",child:null};class xe extends ni{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:gh++}),this.uuid=Xn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=xe.DEFAULT_UP.clone();const t=new D,e=new Pn,n=new Ni,s=new D(1,1,1);function r(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new se},normalMatrix:{value:new Ft}}),this.matrix=new se,this.matrixWorld=new se,this.matrixAutoUpdate=xe.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=xe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new wa,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return li.setFromAxisAngle(t,e),this.quaternion.multiply(li),this}rotateOnWorldAxis(t,e){return li.setFromAxisAngle(t,e),this.quaternion.premultiply(li),this}rotateX(t){return this.rotateOnAxis(go,t)}rotateY(t){return this.rotateOnAxis(_o,t)}rotateZ(t){return this.rotateOnAxis(vo,t)}translateOnAxis(t,e){return mo.copy(t).applyQuaternion(this.quaternion),this.position.add(mo.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(go,t)}translateY(t){return this.translateOnAxis(_o,t)}translateZ(t){return this.translateOnAxis(vo,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(bn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?gs.copy(t):gs.set(t,e,n);const s=this.parent;this.updateWorldMatrix(!0,!1),Bi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?bn.lookAt(Bi,gs,this.up):bn.lookAt(gs,Bi,this.up),this.quaternion.setFromRotationMatrix(bn),s&&(bn.extractRotation(s.matrixWorld),li.setFromRotationMatrix(bn),this.quaternion.premultiply(li.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Yt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(xo),ci.child=t,this.dispatchEvent(ci),ci.child=null):Yt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(xh),yr.child=t,this.dispatchEvent(yr),yr.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),bn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),bn.multiply(t.parent.matrixWorld)),t.applyMatrix4(bn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(xo),ci.child=t,this.dispatchEvent(ci),ci.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){const a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Bi,t,_h),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Bi,vh,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(t){t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const t=this.pivot;if(t!==null){const e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){const s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){const r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];r(t.shapes,u)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(t.materials,this.material[l]));s.material=o}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];s.animations.push(r(t.animations,l))}}if(e){const o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),u=a(t.shapes),d=a(t.skeletons),p=a(t.animations),g=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),p.length>0&&(n.animations=p),g.length>0&&(n.nodes=g)}return n.object=s,n;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}xe.DEFAULT_UP=new D(0,1,0);xe.DEFAULT_MATRIX_AUTO_UPDATE=!0;xe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class ge extends xe{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Mh={type:"move"};class br{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ge,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ge,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ge,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(const _ of t.hand.values()){const m=e.getJointPose(_,n),f=this._getHandJoint(c,_);m!==null&&(f.matrix.fromArray(m.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=m.radius),f.visible=m!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),p=.02,g=.005;c.inputState.pinching&&d>p+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=p-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));o!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Mh)))}return o!==null&&(o.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new ge;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const Yl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},kn={h:0,s:0,l:0},_s={h:0,s:0,l:0};function Tr(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class It{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Ue){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,$t.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=$t.workingColorSpace){return this.r=t,this.g=e,this.b=n,$t.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=$t.workingColorSpace){if(t=oh(t,1),e=Ht(e,0,1),n=Ht(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,a=2*n-r;this.r=Tr(a,r,t+1/3),this.g=Tr(a,r,t),this.b=Tr(a,r,t-1/3)}return $t.colorSpaceToWorking(this,s),this}setStyle(t,e=Ue){function n(r){r!==void 0&&parseFloat(r)<1&&Dt("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Dt("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(r,16),e);Dt("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Ue){const n=Yl[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Dt("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Rn(t.r),this.g=Rn(t.g),this.b=Rn(t.b),this}copyLinearToSRGB(t){return this.r=Li(t.r),this.g=Li(t.g),this.b=Li(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Ue){return $t.workingToColorSpace(Be.copy(this),t),Math.round(Ht(Be.r*255,0,255))*65536+Math.round(Ht(Be.g*255,0,255))*256+Math.round(Ht(Be.b*255,0,255))}getHexString(t=Ue){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=$t.workingColorSpace){$t.workingToColorSpace(Be.copy(this),e);const n=Be.r,s=Be.g,r=Be.b,a=Math.max(n,s,r),o=Math.min(n,s,r);let l,c;const h=(o+a)/2;if(o===a)l=0,c=0;else{const u=a-o;switch(c=h<=.5?u/(a+o):u/(2-a-o),a){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=$t.workingColorSpace){return $t.workingToColorSpace(Be.copy(this),e),t.r=Be.r,t.g=Be.g,t.b=Be.b,t}getStyle(t=Ue){$t.workingToColorSpace(Be.copy(this),t);const e=Be.r,n=Be.g,s=Be.b;return t!==Ue?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(kn),this.setHSL(kn.h+t,kn.s+e,kn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(kn),t.getHSL(_s);const n=_r(kn.h,_s.h,e),s=_r(kn.s,_s.s,e),r=_r(kn.l,_s.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Be=new It;It.NAMES=Yl;class Kl{constructor(t,e=1,n=1e3){this.isFog=!0,this.name="",this.color=new It(t),this.near=e,this.far=n}clone(){return new Kl(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Sh extends xe{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Pn,this.environmentIntensity=1,this.environmentRotation=new Pn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}}const ln=new D,Tn=new D,Er=new D,En=new D,hi=new D,ui=new D,Mo=new D,wr=new D,Ar=new D,Cr=new D,Rr=new pe,Pr=new pe,Lr=new pe;class rn{constructor(t=new D,e=new D,n=new D){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),ln.subVectors(t,e),s.cross(ln);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){ln.subVectors(s,e),Tn.subVectors(n,e),Er.subVectors(t,e);const a=ln.dot(ln),o=ln.dot(Tn),l=ln.dot(Er),c=Tn.dot(Tn),h=Tn.dot(Er),u=a*c-o*o;if(u===0)return r.set(0,0,0),null;const d=1/u,p=(c*l-o*h)*d,g=(a*h-o*l)*d;return r.set(1-p-g,g,p)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,En)===null?!1:En.x>=0&&En.y>=0&&En.x+En.y<=1}static getInterpolation(t,e,n,s,r,a,o,l){return this.getBarycoord(t,e,n,s,En)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,En.x),l.addScaledVector(a,En.y),l.addScaledVector(o,En.z),l)}static getInterpolatedAttribute(t,e,n,s,r,a){return Rr.setScalar(0),Pr.setScalar(0),Lr.setScalar(0),Rr.fromBufferAttribute(t,e),Pr.fromBufferAttribute(t,n),Lr.fromBufferAttribute(t,s),a.setScalar(0),a.addScaledVector(Rr,r.x),a.addScaledVector(Pr,r.y),a.addScaledVector(Lr,r.z),a}static isFrontFacing(t,e,n,s){return ln.subVectors(n,e),Tn.subVectors(t,e),ln.cross(Tn).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ln.subVectors(this.c,this.b),Tn.subVectors(this.a,this.b),ln.cross(Tn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return rn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return rn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return rn.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return rn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return rn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,s=this.b,r=this.c;let a,o;hi.subVectors(s,n),ui.subVectors(r,n),wr.subVectors(t,n);const l=hi.dot(wr),c=ui.dot(wr);if(l<=0&&c<=0)return e.copy(n);Ar.subVectors(t,s);const h=hi.dot(Ar),u=ui.dot(Ar);if(h>=0&&u<=h)return e.copy(s);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return a=l/(l-h),e.copy(n).addScaledVector(hi,a);Cr.subVectors(t,r);const p=hi.dot(Cr),g=ui.dot(Cr);if(g>=0&&p<=g)return e.copy(r);const _=p*c-l*g;if(_<=0&&c>=0&&g<=0)return o=c/(c-g),e.copy(n).addScaledVector(ui,o);const m=h*g-p*u;if(m<=0&&u-h>=0&&p-g>=0)return Mo.subVectors(r,s),o=(u-h)/(u-h+(p-g)),e.copy(s).addScaledVector(Mo,o);const f=1/(m+_+d);return a=_*f,o=d*f,e.copy(n).addScaledVector(hi,a).addScaledVector(ui,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}class ii{constructor(t=new D(1/0,1/0,1/0),e=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(cn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(cn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=cn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,cn):cn.fromBufferAttribute(r,a),cn.applyMatrix4(t.matrixWorld),this.expandByPoint(cn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),vs.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),vs.copy(n.boundingBox)),vs.applyMatrix4(t.matrixWorld),this.union(vs)}const s=t.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,cn),cn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(zi),xs.subVectors(this.max,zi),di.subVectors(t.a,zi),fi.subVectors(t.b,zi),pi.subVectors(t.c,zi),Bn.subVectors(fi,di),zn.subVectors(pi,fi),Kn.subVectors(di,pi);let e=[0,-Bn.z,Bn.y,0,-zn.z,zn.y,0,-Kn.z,Kn.y,Bn.z,0,-Bn.x,zn.z,0,-zn.x,Kn.z,0,-Kn.x,-Bn.y,Bn.x,0,-zn.y,zn.x,0,-Kn.y,Kn.x,0];return!Dr(e,di,fi,pi,xs)||(e=[1,0,0,0,1,0,0,0,1],!Dr(e,di,fi,pi,xs))?!1:(Ms.crossVectors(Bn,zn),e=[Ms.x,Ms.y,Ms.z],Dr(e,di,fi,pi,xs))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,cn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(cn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(wn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),wn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),wn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),wn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),wn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),wn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),wn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),wn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(wn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const wn=[new D,new D,new D,new D,new D,new D,new D,new D],cn=new D,vs=new ii,di=new D,fi=new D,pi=new D,Bn=new D,zn=new D,Kn=new D,zi=new D,xs=new D,Ms=new D,Jn=new D;function Dr(i,t,e,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){Jn.fromArray(i,r);const o=s.x*Math.abs(Jn.x)+s.y*Math.abs(Jn.y)+s.z*Math.abs(Jn.z),l=t.dot(Jn),c=e.dot(Jn),h=n.dot(Jn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const ye=new D,Ss=new ut;let yh=0;class un extends ni{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:yh++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Ss.fromBufferAttribute(this,e),Ss.applyMatrix3(t),this.setXY(e,Ss.x,Ss.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyMatrix3(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyMatrix4(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyNormalMatrix(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.transformDirection(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Mn(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ae(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Mn(e,this.array)),e}setX(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Mn(e,this.array)),e}setY(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Mn(e,this.array)),e}setZ(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Mn(e,this.array)),e}setW(t,e){return this.normalized&&(e=ae(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),s=ae(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),s=ae(s,this.array),r=ae(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}}class Jl extends un{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class Zl extends un{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class Qt extends un{constructor(t,e,n){super(new Float32Array(t),e,n)}}const bh=new ii,Gi=new D,Ir=new D;class Fi{constructor(t=new D,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):bh.setFromPoints(t).getCenter(n);let s=0;for(let r=0,a=t.length;r<a;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Gi.subVectors(t,this.center);const e=Gi.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Gi,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Ir.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Gi.copy(t.center).add(Ir)),this.expandByPoint(Gi.copy(t.center).sub(Ir))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}let Th=0;const je=new se,Ur=new xe,mi=new D,Ke=new ii,Hi=new ii,Le=new D;class De extends ni{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Th++}),this.uuid=Xn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(ih(t)?Zl:Jl)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Ft().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return je.makeRotationFromQuaternion(t),this.applyMatrix4(je),this}rotateX(t){return je.makeRotationX(t),this.applyMatrix4(je),this}rotateY(t){return je.makeRotationY(t),this.applyMatrix4(je),this}rotateZ(t){return je.makeRotationZ(t),this.applyMatrix4(je),this}translate(t,e,n){return je.makeTranslation(t,e,n),this.applyMatrix4(je),this}scale(t,e,n){return je.makeScale(t,e,n),this.applyMatrix4(je),this}lookAt(t){return Ur.lookAt(t),Ur.updateMatrix(),this.applyMatrix4(Ur.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(mi).negate(),this.translate(mi.x,mi.y,mi.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let s=0,r=t.length;s<r;s++){const a=t[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Qt(n,3))}else{const n=Math.min(t.length,e.count);for(let s=0;s<n;s++){const r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Dt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ii);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Yt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){const r=e[n];Ke.setFromBufferAttribute(r),this.morphTargetsRelative?(Le.addVectors(this.boundingBox.min,Ke.min),this.boundingBox.expandByPoint(Le),Le.addVectors(this.boundingBox.max,Ke.max),this.boundingBox.expandByPoint(Le)):(this.boundingBox.expandByPoint(Ke.min),this.boundingBox.expandByPoint(Ke.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Yt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Fi);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Yt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(t){const n=this.boundingSphere.center;if(Ke.setFromBufferAttribute(t),e)for(let r=0,a=e.length;r<a;r++){const o=e[r];Hi.setFromBufferAttribute(o),this.morphTargetsRelative?(Le.addVectors(Ke.min,Hi.min),Ke.expandByPoint(Le),Le.addVectors(Ke.max,Hi.max),Ke.expandByPoint(Le)):(Ke.expandByPoint(Hi.min),Ke.expandByPoint(Hi.max))}Ke.getCenter(n);let s=0;for(let r=0,a=t.count;r<a;r++)Le.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Le));if(e)for(let r=0,a=e.length;r<a;r++){const o=e[r],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Le.fromBufferAttribute(o,c),l&&(mi.fromBufferAttribute(t,c),Le.add(mi)),s=Math.max(s,n.distanceToSquared(Le))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Yt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Yt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,s=e.normal,r=e.uv;let a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new un(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));const o=[],l=[];for(let x=0;x<n.count;x++)o[x]=new D,l[x]=new D;const c=new D,h=new D,u=new D,d=new ut,p=new ut,g=new ut,_=new D,m=new D;function f(x,w,C){c.fromBufferAttribute(n,x),h.fromBufferAttribute(n,w),u.fromBufferAttribute(n,C),d.fromBufferAttribute(r,x),p.fromBufferAttribute(r,w),g.fromBufferAttribute(r,C),h.sub(c),u.sub(c),p.sub(d),g.sub(d);const I=1/(p.x*g.y-g.x*p.y);isFinite(I)&&(_.copy(h).multiplyScalar(g.y).addScaledVector(u,-p.y).multiplyScalar(I),m.copy(u).multiplyScalar(p.x).addScaledVector(h,-g.x).multiplyScalar(I),o[x].add(_),o[w].add(_),o[C].add(_),l[x].add(m),l[w].add(m),l[C].add(m))}let v=this.groups;v.length===0&&(v=[{start:0,count:t.count}]);for(let x=0,w=v.length;x<w;++x){const C=v[x],I=C.start,A=C.count;for(let U=I,L=I+A;U<L;U+=3)f(t.getX(U+0),t.getX(U+1),t.getX(U+2))}const T=new D,S=new D,E=new D,y=new D;function R(x){E.fromBufferAttribute(s,x),y.copy(E);const w=o[x];T.copy(w),T.sub(E.multiplyScalar(E.dot(w))).normalize(),S.crossVectors(y,w);const I=S.dot(l[x])<0?-1:1;a.setXYZW(x,T.x,T.y,T.z,I)}for(let x=0,w=v.length;x<w;++x){const C=v[x],I=C.start,A=C.count;for(let U=I,L=I+A;U<L;U+=3)R(t.getX(U+0)),R(t.getX(U+1)),R(t.getX(U+2))}this._transformed=!0}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new un(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,p=n.count;d<p;d++)n.setXYZ(d,0,0,0);const s=new D,r=new D,a=new D,o=new D,l=new D,c=new D,h=new D,u=new D;if(t)for(let d=0,p=t.count;d<p;d+=3){const g=t.getX(d+0),_=t.getX(d+1),m=t.getX(d+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,_),a.fromBufferAttribute(e,m),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let d=0,p=e.count;d<p;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),a.fromBufferAttribute(e,d+2),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Le.fromBufferAttribute(t,e),Le.normalize(),t.setXYZ(e,Le.x,Le.y,Le.z)}toNonIndexed(){function t(o,l){const c=o.array,h=o.itemSize,u=o.normalized,d=new c.constructor(l.length*h);let p=0,g=0;for(let _=0,m=l.length;_<m;_++){o.isInterleavedBufferAttribute?p=l[_]*o.data.stride+o.offset:p=l[_]*h;for(let f=0;f<h;f++)d[g++]=c[p++]}return new un(d,h,u)}if(this.index===null)return Dt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new De,n=this.index.array,s=this.attributes;for(const o in s){const l=s[o],c=t(l,n);e.setAttribute(o,c)}const r=this.morphAttributes;for(const o in r){const l=[],c=r[o];for(let h=0,u=c.length;h<u;h++){const d=c[h],p=t(d,n);l.push(p)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const p=c[u];h.push(p.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere=o.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone());const s=t.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(e))}const r=t.morphAttributes;for(const c in r){const h=[],u=r[c];for(let d=0,p=u.length;d<p;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let c=0,h=a.length;c<h;c++){const u=a[c];this.addGroup(u.start,u.count,u.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Eh{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=Xn()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[n+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Xn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Xn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));const e={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return e.usage=this.usage,e}}const Ge=new D;class tr{constructor(t,e,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)Ge.fromBufferAttribute(this,e),Ge.applyMatrix4(t),this.setXYZ(e,Ge.x,Ge.y,Ge.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ge.fromBufferAttribute(this,e),Ge.applyNormalMatrix(t),this.setXYZ(e,Ge.x,Ge.y,Ge.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ge.fromBufferAttribute(this,e),Ge.transformDirection(t),this.setXYZ(e,Ge.x,Ge.y,Ge.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=Mn(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=ae(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=ae(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=Mn(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=Mn(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=Mn(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=Mn(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),s=ae(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=ae(e,this.array),n=ae(n,this.array),s=ae(s,this.array),r=ae(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){js("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new un(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new tr(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){js("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}const Nr=new D,wh=new D,Ah=new Ft;class Vn{constructor(t=new D(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const s=Nr.subVectors(n,e).cross(wh.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){const s=t.delta(Nr),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const a=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:e.copy(t.start).addScaledVector(s,a)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Ah.getNormalMatrix(t),s=this.coplanarPoint(Nr).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}}let Ch=0;class qn extends ni{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ch++}),this.uuid=Xn(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new It(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){Dt(`Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Dt(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const a=[];for(const o in r){const l=r[o];delete l.metadata,a.push(l)}return a}if(e){const r=s(t.textures),a=s(t.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new It().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=t.iridescenceThicknessRange),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new Vn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ut().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ut().fromArray(t.clearcoatNormalScale)),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class Ql extends qn{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new It(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}let gi;const Vi=new D,_i=new D,vi=new D,xi=new ut,Wi=new ut,jl=new se,ys=new D,Xi=new D,bs=new D,So=new ut,Fr=new ut,yo=new ut;class Rh extends xe{constructor(t=new Ql){if(super(),this.isSprite=!0,this.type="Sprite",gi===void 0){gi=new De;const e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Eh(e,5);gi.setIndex([0,1,2,0,2,3]),gi.setAttribute("position",new tr(n,3,0,!1)),gi.setAttribute("uv",new tr(n,2,3,!1))}this.geometry=gi,this.material=t,this.center=new ut(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&Yt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),_i.setFromMatrixScale(this.matrixWorld),jl.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),vi.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&_i.multiplyScalar(-vi.z);const n=this.material.rotation;let s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));const a=this.center;Ts(ys.set(-.5,-.5,0),vi,a,_i,s,r),Ts(Xi.set(.5,-.5,0),vi,a,_i,s,r),Ts(bs.set(.5,.5,0),vi,a,_i,s,r),So.set(0,0),Fr.set(1,0),yo.set(1,1);let o=t.ray.intersectTriangle(ys,Xi,bs,!1,Vi);if(o===null&&(Ts(Xi.set(-.5,.5,0),vi,a,_i,s,r),Fr.set(0,1),o=t.ray.intersectTriangle(ys,bs,Xi,!1,Vi),o===null))return;const l=t.ray.origin.distanceTo(Vi);l<t.near||l>t.far||e.push({distance:l,point:Vi.clone(),uv:rn.getInterpolation(Vi,ys,Xi,bs,So,Fr,yo,new ut),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}}function Ts(i,t,e,n,s,r){xi.subVectors(i,e).addScalar(.5).multiply(n),s!==void 0?(Wi.x=r*xi.x-s*xi.y,Wi.y=s*xi.x+r*xi.y):Wi.copy(xi),i.copy(t),i.x+=Wi.x,i.y+=Wi.y,i.applyMatrix4(jl)}const An=new D,Or=new D,Es=new D,ws=new D;class Aa{constructor(t=new D,e=new D(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,An)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=An.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(An.copy(this.origin).addScaledVector(this.direction,e),An.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){Or.copy(t).add(e).multiplyScalar(.5),Es.copy(e).sub(t).normalize(),ws.copy(this.origin).sub(Or);const r=t.distanceTo(e)*.5,a=-this.direction.dot(Es),o=ws.dot(this.direction),l=-ws.dot(Es),c=ws.lengthSq(),h=Math.abs(1-a*a);let u,d,p,g;if(h>0)if(u=a*l-o,d=a*o-l,g=r*h,u>=0)if(d>=-g)if(d<=g){const _=1/h;u*=_,d*=_,p=u*(u+a*d+2*o)+d*(a*u+d+2*l)+c}else d=r,u=Math.max(0,-(a*d+o)),p=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(a*d+o)),p=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-a*r+o)),d=u>0?-r:Math.min(Math.max(-r,-l),r),p=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-r,-l),r),p=d*(d+2*l)+c):(u=Math.max(0,-(a*r+o)),d=u>0?r:Math.min(Math.max(-r,-l),r),p=-u*u+d*(d+2*l)+c);else d=a>0?-r:r,u=Math.max(0,-(a*d+o)),p=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(Or).addScaledVector(Es,d),p}intersectSphere(t,e){if(t.radius<0)return null;An.subVectors(t.center,this.origin);const n=An.dot(this.direction),s=An.dot(An)-n*n,r=t.radius*t.radius;if(s>r)return null;const a=Math.sqrt(r-s),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(t.min.x-d.x)*c,s=(t.max.x-d.x)*c):(n=(t.max.x-d.x)*c,s=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,a=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,a=(t.min.y-d.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),u>=0?(o=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(o=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),n>l||o>s)||((o>n||n!==n)&&(n=o),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,An)!==null}intersectTriangle(t,e,n,s,r){const a=this.origin,o=this.direction,l=o.x,c=o.y,h=o.z,u=t.x-a.x,d=t.y-a.y,p=t.z-a.z,g=e.x-a.x,_=e.y-a.y,m=e.z-a.z,f=n.x-a.x,v=n.y-a.y,T=n.z-a.z,S=Math.abs(l),E=Math.abs(c),y=Math.abs(h);let R,x,w,C,I,A,U,L,k,$,H,j;if(S>=E&&S>=y?(w=l,A=u,k=g,j=f,l>=0?(R=c,x=h,C=d,I=p,U=_,L=m,$=v,H=T):(R=h,x=c,C=p,I=d,U=m,L=_,$=T,H=v)):E>=y?(w=c,A=d,k=_,j=v,c>=0?(R=h,x=l,C=p,I=u,U=m,L=g,$=T,H=f):(R=l,x=h,C=u,I=p,U=g,L=m,$=f,H=T)):(w=h,A=p,k=m,j=T,h>=0?(R=l,x=c,C=u,I=d,U=g,L=_,$=f,H=v):(R=c,x=l,C=d,I=u,U=_,L=g,$=v,H=f)),w===0)return null;const X=R/w,tt=x/w,et=1/w,yt=C-X*A,wt=I-tt*A,ne=U-X*k,kt=L-tt*k,qt=$-X*j,Y=H-tt*j,it=qt*kt-Y*ne,St=yt*Y-wt*qt,Nt=ne*wt-kt*yt;if(s){if(it<0||St<0||Nt<0)return null}else if((it<0||St<0||Nt<0)&&(it>0||St>0||Nt>0))return null;const xt=it+St+Nt;if(xt===0)return null;const Gt=et*(it*A+St*k+Nt*j);return(xt>0?Gt<0:Gt>0)?null:this.at(Gt/xt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class qe extends qn{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new It(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pn,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const bo=new se,Zn=new Aa,As=new Fi,To=new D,Cs=new D,Rs=new D,Ps=new D,kr=new D,Ls=new D,Eo=new D,Ds=new D;class pt extends xe{constructor(t=new De,e=new qe){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(t,e){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(s,t);const o=this.morphTargetInfluences;if(r&&o){Ls.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=o[l],u=r[l];h!==0&&(kr.fromBufferAttribute(u,t),a?Ls.addScaledVector(kr,h):Ls.addScaledVector(kr.sub(e),h))}e.add(Ls)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),As.copy(n.boundingSphere),As.applyMatrix4(r),Zn.copy(t.ray).recast(t.near),!(As.containsPoint(Zn.origin)===!1&&(Zn.intersectSphere(As,To)===null||Zn.origin.distanceToSquared(To)>(t.far-t.near)**2))&&(bo.copy(r).invert(),Zn.copy(t.ray).applyMatrix4(bo),!(n.boundingBox!==null&&Zn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Zn)))}_computeIntersections(t,e,n){let s;const r=this.geometry,a=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,p=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=d.length;g<_;g++){const m=d[g],f=a[m.materialIndex],v=Math.max(m.start,p.start),T=Math.min(o.count,Math.min(m.start+m.count,p.start+p.count));for(let S=v,E=T;S<E;S+=3){const y=o.getX(S),R=o.getX(S+1),x=o.getX(S+2);s=Is(this,f,t,n,c,h,u,y,R,x),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,p.start),_=Math.min(o.count,p.start+p.count);for(let m=g,f=_;m<f;m+=3){const v=o.getX(m),T=o.getX(m+1),S=o.getX(m+2);s=Is(this,a,t,n,c,h,u,v,T,S),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,_=d.length;g<_;g++){const m=d[g],f=a[m.materialIndex],v=Math.max(m.start,p.start),T=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let S=v,E=T;S<E;S+=3){const y=S,R=S+1,x=S+2;s=Is(this,f,t,n,c,h,u,y,R,x),s&&(s.faceIndex=Math.floor(S/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,p.start),_=Math.min(l.count,p.start+p.count);for(let m=g,f=_;m<f;m+=3){const v=m,T=m+1,S=m+2;s=Is(this,a,t,n,c,h,u,v,T,S),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}}function Ph(i,t,e,n,s,r,a,o){let l;if(t.side===1?l=n.intersectTriangle(a,r,s,!0,o):l=n.intersectTriangle(s,r,a,t.side===0,o),l===null)return null;Ds.copy(o),Ds.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(Ds);return c<e.near||c>e.far?null:{distance:c,point:Ds.clone(),object:i}}function Is(i,t,e,n,s,r,a,o,l,c){i.getVertexPosition(o,Cs),i.getVertexPosition(l,Rs),i.getVertexPosition(c,Ps);const h=Ph(i,t,e,n,Cs,Rs,Ps,Eo);if(h){const u=new D;rn.getBarycoord(Eo,Cs,Rs,Ps,u),s&&(h.uv=rn.getInterpolatedAttribute(s,o,l,c,u,new ut)),r&&(h.uv1=rn.getInterpolatedAttribute(r,o,l,c,u,new ut)),a&&(h.normal=rn.getInterpolatedAttribute(a,o,l,c,u,new D),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a:o,b:l,c,normal:new D,materialIndex:0};rn.getNormal(Cs,Rs,Ps,d.normal),h.face=d,h.barycoord=u}return h}class tc extends Ne{constructor(t=null,e=1,n=1,s,r,a,o,l,c=1003,h=1003,u,d){super(null,a,o,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class wo extends un{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Mi=new se,Ao=new se,Us=[],Co=new ii,Lh=new se,$i=new pt,qi=new Fi;class Dh extends pt{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new wo(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,Lh)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new ii),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Mi),Co.copy(t.boundingBox).applyMatrix4(Mi),this.boundingBox.union(Co)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Fi),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Mi),qi.copy(t.boundingSphere).applyMatrix4(Mi),this.boundingSphere.union(qi)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){return this.instanceColor===null?e.setRGB(1,1,1):e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){return e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=t*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(t,e){const n=this.matrixWorld,s=this.count;if($i.geometry=this.geometry,$i.material=this.material,$i.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),qi.copy(this.boundingSphere),qi.applyMatrix4(n),t.ray.intersectsSphere(qi)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Mi),Ao.multiplyMatrices(n,Mi),$i.matrixWorld=Ao,$i.raycast(t,Us);for(let a=0,o=Us.length;a<o;a++){const l=Us[a];l.instanceId=r,l.object=this,e.push(l)}Us.length=0}}setColorAt(t,e){return this.instanceColor===null&&(this.instanceColor=new wo(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3),this}setMatrixAt(t,e){return e.toArray(this.instanceMatrix.array,t*16),this}setMorphAt(t,e){const n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new tc(new Float32Array(s*this.count),s,this.count,1028,1015));const r=this.morphTexture.source.data.data;let a=0;for(let c=0;c<n.length;c++)a+=n[c];const o=this.geometry.morphTargetsRelative?1:1-a,l=s*t;return r[l]=o,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Qn=new Fi,Ih=new ut(.5,.5),Ns=new D;class Ca{constructor(t=new Vn,e=new Vn,n=new Vn,s=new Vn,r=new Vn,a=new Vn){this.planes=[t,e,n,s,r,a]}set(t,e,n,s,r,a){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=2e3,n=!1){const s=this.planes,r=t.elements,a=r[0],o=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],p=r[7],g=r[8],_=r[9],m=r[10],f=r[11],v=r[12],T=r[13],S=r[14],E=r[15];if(s[0].setComponents(c-a,p-h,f-g,E-v).normalize(),s[1].setComponents(c+a,p+h,f+g,E+v).normalize(),s[2].setComponents(c+o,p+u,f+_,E+T).normalize(),s[3].setComponents(c-o,p-u,f-_,E-T).normalize(),n)s[4].setComponents(l,d,m,S).normalize(),s[5].setComponents(c-l,p-d,f-m,E-S).normalize();else if(s[4].setComponents(c-l,p-d,f-m,E-S).normalize(),e===2e3)s[5].setComponents(c+l,p+d,f+m,E+S).normalize();else if(e===2001)s[5].setComponents(l,d,m,S).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Qn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Qn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Qn)}intersectsSprite(t){Qn.center.set(0,0,0);const e=Ih.distanceTo(t.center);return Qn.radius=.7071067811865476+e,Qn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Qn)}intersectsSphere(t){const e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const s=e[n];if(Ns.x=s.normal.x>0?t.max.x:t.min.x,Ns.y=s.normal.y>0?t.max.y:t.min.y,Ns.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Ns)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Uh extends qn{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new It(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const er=new D,nr=new D,Ro=new se,Yi=new Aa,Fs=new Fi,Br=new D,Po=new D;class Nh extends xe{constructor(t=new De,e=new Uh){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[0];for(let s=1,r=e.count;s<r;s++)er.fromBufferAttribute(e,s-1),nr.fromBufferAttribute(e,s),n[s]=n[s-1],n[s]+=er.distanceTo(nr);t.setAttribute("lineDistance",new Qt(n,1))}else Dt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){const n=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Fs.copy(n.boundingSphere),Fs.applyMatrix4(s),Fs.radius+=r,t.ray.intersectsSphere(Fs)===!1)return;Ro.copy(s).invert(),Yi.copy(t.ray).applyMatrix4(Ro);const o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){const p=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let _=p,m=g-1;_<m;_+=c){const f=h.getX(_),v=h.getX(_+1),T=Os(this,t,Yi,l,f,v,_);T&&e.push(T)}if(this.isLineLoop){const _=h.getX(g-1),m=h.getX(p),f=Os(this,t,Yi,l,_,m,g-1);f&&e.push(f)}}else{const p=Math.max(0,a.start),g=Math.min(d.count,a.start+a.count);for(let _=p,m=g-1;_<m;_+=c){const f=Os(this,t,Yi,l,_,_+1,_);f&&e.push(f)}if(this.isLineLoop){const _=Os(this,t,Yi,l,g-1,p,g-1);_&&e.push(_)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){const o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}}function Os(i,t,e,n,s,r,a){const o=i.geometry.attributes.position;if(er.fromBufferAttribute(o,s),nr.fromBufferAttribute(o,r),e.distanceSqToSegment(er,nr,Br,Po)>n)return;Br.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(Br);if(!(c<t.near||c>t.far))return{distance:c,point:Po.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}const Lo=new D,Do=new D;class Yg extends Nh{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[];for(let s=0,r=e.count;s<r;s+=2)Lo.fromBufferAttribute(e,s),Do.fromBufferAttribute(e,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+Lo.distanceTo(Do);t.setAttribute("lineDistance",new Qt(n,1))}else Dt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class ec extends Ne{constructor(t=[],e=301,n,s,r,a,o,l,c,h){super(t,e,n,s,r,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class ds extends Ne{constructor(t,e,n,s,r,a,o,l,c){super(t,e,n,s,r,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class is extends Ne{constructor(t,e,n=1014,s,r,a,o=1003,l=1003,c,h=1026,u=1){if(h!==1026&&h!==1027)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:t,height:e,depth:u};super(d,s,r,a,o,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ea(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}}class Fh extends is{constructor(t,e=1014,n=301,s,r,a=1003,o=1003,l,c=1026){const h={width:t,height:t,depth:1},u=[h,h,h,h,h,h];super(t,t,e,n,s,r,a,o,l,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}}class nc extends Ne{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class fe extends De{constructor(t=1,e=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};const o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);const l=[],c=[],h=[],u=[];let d=0,p=0;g("z","y","x",-1,-1,n,e,t,a,r,0),g("z","y","x",1,-1,n,e,-t,a,r,1),g("x","z","y",1,1,t,n,e,s,a,2),g("x","z","y",1,-1,t,n,-e,s,a,3),g("x","y","z",1,-1,t,e,n,s,r,4),g("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new Qt(c,3)),this.setAttribute("normal",new Qt(h,3)),this.setAttribute("uv",new Qt(u,2));function g(_,m,f,v,T,S,E,y,R,x,w){const C=S/R,I=E/x,A=S/2,U=E/2,L=y/2,k=R+1,$=x+1;let H=0,j=0;const X=new D;for(let tt=0;tt<$;tt++){const et=tt*I-U;for(let yt=0;yt<k;yt++){const wt=yt*C-A;X[_]=wt*v,X[m]=et*T,X[f]=L,c.push(X.x,X.y,X.z),X[_]=0,X[m]=0,X[f]=y>0?1:-1,h.push(X.x,X.y,X.z),u.push(yt/R),u.push(1-tt/x),H+=1}}for(let tt=0;tt<x;tt++)for(let et=0;et<R;et++){const yt=d+et+k*tt,wt=d+et+k*(tt+1),ne=d+(et+1)+k*(tt+1),kt=d+(et+1)+k*tt;l.push(yt,wt,kt),l.push(wt,ne,kt),j+=6}o.addGroup(p,j,w),p+=j,d+=H}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new fe(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}class ic extends De{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);const r=[],a=[],o=[],l=[],c=new D,h=new ut;a.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let u=0,d=3;u<=e;u++,d+=3){const p=n+u/e*s;c.x=t*Math.cos(p),c.y=t*Math.sin(p),a.push(c.x,c.y,c.z),o.push(0,0,1),h.x=(a[d]/t+1)/2,h.y=(a[d+1]/t+1)/2,l.push(h.x,h.y)}for(let u=1;u<=e;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new Qt(a,3)),this.setAttribute("normal",new Qt(o,3)),this.setAttribute("uv",new Qt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ic(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class be extends De{constructor(t=1,e=1,n=1,s=32,r=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:l};const c=this;s=Math.floor(s),r=Math.floor(r);const h=[],u=[],d=[],p=[];let g=0;const _=[],m=n/2;let f=0;v(),a===!1&&(t>0&&T(!0),e>0&&T(!1)),this.setIndex(h),this.setAttribute("position",new Qt(u,3)),this.setAttribute("normal",new Qt(d,3)),this.setAttribute("uv",new Qt(p,2));function v(){const S=new D,E=new D;let y=0;const R=(e-t)/n;for(let x=0;x<=r;x++){const w=[],C=x/r,I=C*(e-t)+t;for(let A=0;A<=s;A++){const U=A/s,L=U*l+o,k=Math.sin(L),$=Math.cos(L);E.x=I*k,E.y=-C*n+m,E.z=I*$,u.push(E.x,E.y,E.z),S.set(k,R,$).normalize(),d.push(S.x,S.y,S.z),p.push(U,1-C),w.push(g++)}_.push(w)}for(let x=0;x<s;x++)for(let w=0;w<r;w++){const C=_[w][x],I=_[w+1][x],A=_[w+1][x+1],U=_[w][x+1];(t>0||w!==0)&&(h.push(C,I,U),y+=3),(e>0||w!==r-1)&&(h.push(I,A,U),y+=3)}c.addGroup(f,y,0),f+=y}function T(S){const E=g,y=new ut,R=new D;let x=0;const w=S===!0?t:e,C=S===!0?1:-1;for(let A=1;A<=s;A++)u.push(0,m*C,0),d.push(0,C,0),p.push(.5,.5),g++;const I=g;for(let A=0;A<=s;A++){const L=A/s*l+o,k=Math.cos(L),$=Math.sin(L);R.x=w*$,R.y=m*C,R.z=w*k,u.push(R.x,R.y,R.z),d.push(0,C,0),y.x=k*.5+.5,y.y=$*.5*C+.5,p.push(y.x,y.y),g++}for(let A=0;A<s;A++){const U=E+A,L=I+A;S===!0?h.push(L,L+1,U):h.push(L+1,L,U),x+=3}c.addGroup(f,x,S===!0?1:2),f+=x}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new be(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Ra extends De{constructor(t=[],e=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:s};const r=[],a=[];o(s),c(n),h(),this.setAttribute("position",new Qt(r,3)),this.setAttribute("normal",new Qt(r.slice(),3)),this.setAttribute("uv",new Qt(a,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function o(v){const T=new D,S=new D,E=new D;for(let y=0;y<e.length;y+=3)p(e[y+0],T),p(e[y+1],S),p(e[y+2],E),l(T,S,E,v)}function l(v,T,S,E){const y=E+1,R=[];for(let x=0;x<=y;x++){R[x]=[];const w=v.clone().lerp(S,x/y),C=T.clone().lerp(S,x/y),I=y-x;for(let A=0;A<=I;A++)A===0&&x===y?R[x][A]=w:R[x][A]=w.clone().lerp(C,A/I)}for(let x=0;x<y;x++)for(let w=0;w<2*(y-x)-1;w++){const C=Math.floor(w/2);w%2===0?(d(R[x][C+1]),d(R[x+1][C]),d(R[x][C])):(d(R[x][C+1]),d(R[x+1][C+1]),d(R[x+1][C]))}}function c(v){const T=new D;for(let S=0;S<r.length;S+=3)T.x=r[S+0],T.y=r[S+1],T.z=r[S+2],T.normalize().multiplyScalar(v),r[S+0]=T.x,r[S+1]=T.y,r[S+2]=T.z}function h(){const v=new D;for(let T=0;T<r.length;T+=3){v.x=r[T+0],v.y=r[T+1],v.z=r[T+2];const S=m(v)/2/Math.PI+.5,E=f(v)/Math.PI+.5;a.push(S,1-E)}g(),u()}function u(){for(let v=0;v<a.length;v+=6){const T=a[v+0],S=a[v+2],E=a[v+4],y=Math.max(T,S,E),R=Math.min(T,S,E);y>.9&&R<.1&&(T<.2&&(a[v+0]+=1),S<.2&&(a[v+2]+=1),E<.2&&(a[v+4]+=1))}}function d(v){r.push(v.x,v.y,v.z)}function p(v,T){const S=v*3;T.x=t[S+0],T.y=t[S+1],T.z=t[S+2]}function g(){const v=new D,T=new D,S=new D,E=new D,y=new ut,R=new ut,x=new ut;for(let w=0,C=0;w<r.length;w+=9,C+=6){v.set(r[w+0],r[w+1],r[w+2]),T.set(r[w+3],r[w+4],r[w+5]),S.set(r[w+6],r[w+7],r[w+8]),y.set(a[C+0],a[C+1]),R.set(a[C+2],a[C+3]),x.set(a[C+4],a[C+5]),E.copy(v).add(T).add(S).divideScalar(3);const I=m(E);_(y,C+0,v,I),_(R,C+2,T,I),_(x,C+4,S,I)}}function _(v,T,S,E){E<0&&v.x===1&&(a[T]=v.x-1),S.x===0&&S.z===0&&(a[T]=E/2/Math.PI+.5)}function m(v){return Math.atan2(v.z,-v.x)}function f(v){return Math.atan2(-v.y,Math.sqrt(v.x*v.x+v.z*v.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ra(t.vertices,t.indices,t.radius,t.detail)}}class Dn{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Dt("Curve: .getPoint() not implemented.")}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,s=this.getPoint(0),r=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){const n=this.getLengths();let s=0;const r=n.length;let a;e?a=e:a=t*n[r-1];let o=0,l=r-1,c;for(;o<=l;)if(s=Math.floor(o+(l-o)/2),c=n[s]-a,c<0)o=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===a)return s/(r-1);const h=n[s],d=n[s+1]-h,p=(a-h)/d;return(s+p)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);const a=this.getPoint(s),o=this.getPoint(r),l=e||(a.isVector2?new ut:new D);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){const n=new D,s=[],r=[],a=[],o=new D,l=new se;for(let p=0;p<=t;p++){const g=p/t;s[p]=this.getTangentAt(g,new D)}r[0]=new D,a[0]=new D;let c=Number.MAX_VALUE;const h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let p=1;p<=t;p++){if(r[p]=r[p-1].clone(),a[p]=a[p-1].clone(),o.crossVectors(s[p-1],s[p]),o.length()>Number.EPSILON){o.normalize();const g=Math.acos(Ht(s[p-1].dot(s[p]),-1,1));r[p].applyMatrix4(l.makeRotationAxis(o,g))}a[p].crossVectors(s[p],r[p])}if(e===!0){let p=Math.acos(Ht(r[0].dot(r[t]),-1,1));p/=t,s[0].dot(o.crossVectors(r[0],r[t]))>0&&(p=-p);for(let g=1;g<=t;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],p*g)),a[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class sc extends Dn{constructor(t=0,e=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e=new ut){const n=e,s=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);const o=this.aStartAngle+t*r;let l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,p=c-this.aY;l=d*h-p*u+this.aX,c=d*u+p*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Oh extends sc{constructor(t,e,n,s,r,a){super(t,e,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}}function Pa(){let i=0,t=0,e=0,n=0;function s(r,a,o,l){i=r,t=o,e=-3*r+3*a-2*o-l,n=2*r-2*a+o+l}return{initCatmullRom:function(r,a,o,l,c){s(a,o,c*(o-r),c*(l-a))},initNonuniformCatmullRom:function(r,a,o,l,c,h,u){let d=(a-r)/c-(o-r)/(c+h)+(o-a)/h,p=(o-a)/h-(l-a)/(h+u)+(l-o)/u;d*=h,p*=h,s(a,o,d,p)},calc:function(r){const a=r*r,o=a*r;return i+t*r+e*a+n*o}}}const Io=new D,Uo=new D,zr=new Pa,Gr=new Pa,Hr=new Pa;class rc extends Dn{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new D){const n=e,s=this.points,r=s.length,a=(r-(this.closed?0:1))*t;let o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,h;this.closed||o>0?c=s[(o-1)%r]:(Uo.subVectors(s[0],s[1]).add(s[0]),c=Uo);const u=s[o%r],d=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(Io.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Io),this.curveType==="centripetal"||this.curveType==="chordal"){const p=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(u),p),_=Math.pow(u.distanceToSquared(d),p),m=Math.pow(d.distanceToSquared(h),p);_<1e-4&&(_=1),g<1e-4&&(g=_),m<1e-4&&(m=_),zr.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,g,_,m),Gr.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,g,_,m),Hr.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,g,_,m)}else this.curveType==="catmullrom"&&(zr.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),Gr.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),Hr.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return n.set(zr.calc(l),Gr.calc(l),Hr.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new D().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function No(i,t,e,n,s){const r=(n-t)*.5,a=(s-e)*.5,o=i*i,l=i*o;return(2*e-2*n+r+a)*l+(-3*e+3*n-2*r-a)*o+r*i+e}function kh(i,t){const e=1-i;return e*e*t}function Bh(i,t){return 2*(1-i)*i*t}function zh(i,t){return i*i*t}function ts(i,t,e,n){return kh(i,t)+Bh(i,e)+zh(i,n)}function Gh(i,t){const e=1-i;return e*e*e*t}function Hh(i,t){const e=1-i;return 3*e*e*i*t}function Vh(i,t){return 3*(1-i)*i*i*t}function Wh(i,t){return i*i*i*t}function es(i,t,e,n,s){return Gh(i,t)+Hh(i,e)+Vh(i,n)+Wh(i,s)}class Xh extends Dn{constructor(t=new ut,e=new ut,n=new ut,s=new ut){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new ut){const n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(es(t,s.x,r.x,a.x,o.x),es(t,s.y,r.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class $h extends Dn{constructor(t=new D,e=new D,n=new D,s=new D){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new D){const n=e,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(es(t,s.x,r.x,a.x,o.x),es(t,s.y,r.y,a.y,o.y),es(t,s.z,r.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class qh extends Dn{constructor(t=new ut,e=new ut){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ut){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ut){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Yh extends Dn{constructor(t=new D,e=new D){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new D){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new D){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Kh extends Dn{constructor(t=new ut,e=new ut,n=new ut){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ut){const n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(ts(t,s.x,r.x,a.x),ts(t,s.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class ac extends Dn{constructor(t=new D,e=new D,n=new D){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new D){const n=e,s=this.v0,r=this.v1,a=this.v2;return n.set(ts(t,s.x,r.x,a.x),ts(t,s.y,r.y,a.y),ts(t,s.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Jh extends Dn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ut){const n=e,s=this.points,r=(s.length-1)*t,a=Math.floor(r),o=r-a,l=s[a===0?a:a-1],c=s[a],h=s[a>s.length-2?s.length-1:a+1],u=s[a>s.length-3?s.length-1:a+2];return n.set(No(o,l.x,c.x,h.x,u.x),No(o,l.y,c.y,h.y,u.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new ut().fromArray(s))}return this}}var Zh=Object.freeze({__proto__:null,ArcCurve:Oh,CatmullRomCurve3:rc,CubicBezierCurve:Xh,CubicBezierCurve3:$h,EllipseCurve:sc,LineCurve:qh,LineCurve3:Yh,QuadraticBezierCurve:Kh,QuadraticBezierCurve3:ac,SplineCurve:Jh});class La extends Ra{constructor(t=1,e=0){const n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],s=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,s,t,e),this.type="OctahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new La(t.radius,t.detail)}}class Ln extends De{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};const r=t/2,a=e/2,o=Math.floor(n),l=Math.floor(s),c=o+1,h=l+1,u=t/o,d=e/l,p=[],g=[],_=[],m=[];for(let f=0;f<h;f++){const v=f*d-a;for(let T=0;T<c;T++){const S=T*u-r;g.push(S,-v,0),_.push(0,0,1),m.push(T/o),m.push(1-f/l)}}for(let f=0;f<l;f++)for(let v=0;v<o;v++){const T=v+c*f,S=v+c*(f+1),E=v+1+c*(f+1),y=v+1+c*f;p.push(T,S,y),p.push(S,E,y)}this.setIndex(p),this.setAttribute("position",new Qt(g,3)),this.setAttribute("normal",new Qt(_,3)),this.setAttribute("uv",new Qt(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ln(t.width,t.height,t.widthSegments,t.heightSegments)}}class or extends De{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const h=[],u=new D,d=new D,p=[],g=[],_=[],m=[];for(let f=0;f<=n;f++){const v=[],T=f/n,S=a+T*o,E=t*Math.cos(S),y=Math.sqrt(t*t-E*E);let R=0;f===0&&a===0?R=.5/e:f===n&&l===Math.PI&&(R=-.5/e);for(let x=0;x<=e;x++){const w=x/e,C=s+w*r;u.x=-y*Math.cos(C),u.y=E,u.z=y*Math.sin(C),g.push(u.x,u.y,u.z),d.copy(u).normalize(),_.push(d.x,d.y,d.z),m.push(w+R,1-T),v.push(c++)}h.push(v)}for(let f=0;f<n;f++)for(let v=0;v<e;v++){const T=h[f][v+1],S=h[f][v],E=h[f+1][v],y=h[f+1][v+1];(f!==0||a>0)&&p.push(T,S,y),(f!==n-1||l<Math.PI)&&p.push(S,E,y)}this.setIndex(p),this.setAttribute("position",new Qt(g,3)),this.setAttribute("normal",new Qt(_,3)),this.setAttribute("uv",new Qt(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new or(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class Da extends De{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2,a=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r,thetaStart:a,thetaLength:o},n=Math.floor(n),s=Math.floor(s);const l=[],c=[],h=[],u=[],d=new D,p=new D,g=new D;for(let _=0;_<=n;_++){const m=a+_/n*o;for(let f=0;f<=s;f++){const v=f/s*r;p.x=(t+e*Math.cos(m))*Math.cos(v),p.y=(t+e*Math.cos(m))*Math.sin(v),p.z=e*Math.sin(m),c.push(p.x,p.y,p.z),d.x=t*Math.cos(v),d.y=t*Math.sin(v),g.subVectors(p,d).normalize(),h.push(g.x,g.y,g.z),u.push(f/s),u.push(_/n)}}for(let _=1;_<=n;_++)for(let m=1;m<=s;m++){const f=(s+1)*_+m-1,v=(s+1)*(_-1)+m-1,T=(s+1)*(_-1)+m,S=(s+1)*_+m;l.push(f,v,S),l.push(v,T,S)}this.setIndex(l),this.setAttribute("position",new Qt(c,3)),this.setAttribute("normal",new Qt(h,3)),this.setAttribute("uv",new Qt(u,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Da(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}}class Ia extends De{constructor(t=new ac(new D(-1,-1,0),new D(-1,1,0),new D(1,1,0)),e=64,n=1,s=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:s,closed:r};const a=t.computeFrenetFrames(e,r);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;const o=new D,l=new D,c=new ut;let h=new D;const u=[],d=[],p=[],g=[];_(),this.setIndex(g),this.setAttribute("position",new Qt(u,3)),this.setAttribute("normal",new Qt(d,3)),this.setAttribute("uv",new Qt(p,2));function _(){for(let T=0;T<e;T++)m(T);m(r===!1?e:0),v(),f()}function m(T){h=t.getPointAt(T/e,h);const S=a.normals[T],E=a.binormals[T];for(let y=0;y<=s;y++){const R=y/s*Math.PI*2,x=Math.sin(R),w=-Math.cos(R);l.x=w*S.x+x*E.x,l.y=w*S.y+x*E.y,l.z=w*S.z+x*E.z,l.normalize(),d.push(l.x,l.y,l.z),o.x=h.x+n*l.x,o.y=h.y+n*l.y,o.z=h.z+n*l.z,u.push(o.x,o.y,o.z)}}function f(){for(let T=1;T<=e;T++)for(let S=1;S<=s;S++){const E=(s+1)*(T-1)+(S-1),y=(s+1)*T+(S-1),R=(s+1)*T+S,x=(s+1)*(T-1)+S;g.push(E,y,x),g.push(y,R,x)}}function v(){for(let T=0;T<=e;T++)for(let S=0;S<=s;S++)c.x=T/e,c.y=S/s,p.push(c.x,c.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new Ia(new Zh[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}function Di(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const s=i[e][n];if(Fo(s))s.isRenderTargetTexture?(Dt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(Fo(s[0])){const r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function Ve(i){const t={};for(let e=0;e<i.length;e++){const n=Di(i[e]);for(const s in n)t[s]=n[s]}return t}function Fo(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Qh(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function oc(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:$t.workingColorSpace}const ss={clone:Di,merge:Ve};var jh=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,tu=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ae extends qn{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=jh,this.fragmentShader=tu,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Di(t.uniforms),this.uniformsGroups=Qh(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const a=this.uniforms[s].value;a&&a.isTexture?e.uniforms[s]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[s]={type:"m4",value:a.toArray()}:e.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(const n in t.uniforms){const s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new It().setHex(s.value);break;case"v2":this.uniforms[n].value=new ut().fromArray(s.value);break;case"v3":this.uniforms[n].value=new D().fromArray(s.value);break;case"v4":this.uniforms[n].value=new pe().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Ft().fromArray(s.value);break;case"m4":this.uniforms[n].value=new se().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(const n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}}class lc extends Ae{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Je extends qn{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new It(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new It(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class lr extends Je{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ut(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ht(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new It(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new It(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new It(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(t){this._retroreflectivity>0!=t>0&&this.version++,this._retroreflectivity=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.retroreflectivity=t.retroreflectivity,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class eu extends qn{constructor(t){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new It(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new It(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pn,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.envMapIntensity=t.envMapIntensity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class nu extends qn{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class iu extends qn{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const Vr={enabled:!1,files:{},add:function(i,t){this.enabled!==!1&&(Oo(i)||(this.files[i]=t))},get:function(i){if(this.enabled!==!1&&!Oo(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Oo(i){try{const t=i.slice(i.indexOf(":")+1);return new URL(t).protocol==="blob:"}catch{return!1}}class su{constructor(t,e,n){const s=this;let r=!1,a=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const p=c[u],g=c[u+1];if(p.global&&(p.lastIndex=0),p.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const ru=new su;class Ua{constructor(t){this.manager=t!==void 0?t:ru,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(t,e){const n=this;return new Promise(function(s,r){n.load(t,s,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}}Ua.DEFAULT_MATERIAL_NAME="__DEFAULT";const Si=new WeakMap;class au extends Ua{constructor(t){super(t)}load(t,e,n,s){this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);const r=this,a=Vr.get(`image:${t}`);if(a!==void 0){if(a.complete===!0)r.manager.itemStart(t),setTimeout(function(){e&&e(a),r.manager.itemEnd(t)},0);else{let u=Si.get(a);u===void 0&&(u=[],Si.set(a,u)),u.push({onLoad:e,onError:s})}return a}const o=ns("img");function l(){h(),e&&e(this);const u=Si.get(this)||[];for(let d=0;d<u.length;d++){const p=u[d];p.onLoad&&p.onLoad(this)}Si.delete(this),r.manager.itemEnd(t)}function c(u){h(),s&&s(u),Vr.remove(`image:${t}`);const d=Si.get(this)||[];for(let p=0;p<d.length;p++){const g=d[p];g.onError&&g.onError(u)}Si.delete(this),r.manager.itemError(t),r.manager.itemEnd(t)}function h(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),t.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),Vr.add(`image:${t}`,o),r.manager.itemStart(t),o.src=t,o}}class ou extends Ua{constructor(t){super(t)}load(t,e,n,s){const r=new Ne,a=new au(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(t,function(o){r.image=o,r.needsUpdate=!0,e!==void 0&&e(r)},n,s),r}}class Na extends xe{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new It(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}}class Kg extends Na{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(xe.DEFAULT_UP),this.updateMatrix(),this.groundColor=new It(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){const e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}}const Wr=new se,ko=new D,Bo=new D;class cc{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ut(512,512),this.mapType=1009,this.map=null,this.mapPass=null,this.matrix=new se,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ca,this._frameExtents=new ut(1,1),this._viewportCount=1,this._viewports=[new pe(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera;ko.setFromMatrixPosition(t.matrixWorld),e.position.copy(ko),Bo.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Bo),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){Wr.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(Wr,t.coordinateSystem,t.reversedDepth);const r=this._frameExtents,a=s?s.z/r.x:1,o=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===2001||t.reversedDepth?e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):e.set(.5*a,0,0,.5*a+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),e.multiply(Wr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}const ks=new D,Bs=new Ni,pn=new D;class hc extends xe{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new se,this.projectionMatrix=new se,this.projectionMatrixInverse=new se,this.coordinateSystem=2e3,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(ks,Bs,pn),pn.x===1&&pn.y===1&&pn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ks,Bs,pn.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(ks,Bs,pn),pn.x===1&&pn.y===1&&pn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ks,Bs,pn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Gn=new D,zo=new ut,Go=new ut;class sn extends hc{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=oa*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(gr*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return oa*2*Math.atan(Math.tan(gr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Gn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Gn.x,Gn.y).multiplyScalar(-t/Gn.z),Gn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Gn.x,Gn.y).multiplyScalar(-t/Gn.z)}getViewSize(t,e){return this.getViewBounds(t,zo,Go),e.subVectors(Go,zo)}setViewOffset(t,e,n,s,r,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(gr*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;r+=a.offsetX*s/l,e-=a.offsetY*n/c,s*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(r+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}class lu extends cc{constructor(){super(new sn(90,1,.5,500)),this.isPointLightShadow=!0}}class cu extends Na{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new lu}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){const e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}}class cr extends hc{constructor(t=-1,e=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-t,a=n+t,o=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,a=r+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class hu extends cc{constructor(){super(new cr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Jg extends Na{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(xe.DEFAULT_UP),this.updateMatrix(),this.target=new xe,this.shadow=new hu}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){const e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}}const yi=-90,bi=1;class uu extends xe{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new sn(yi,bi,t,e);s.layers=this.layers,this.add(s);const r=new sn(yi,bi,t,e);r.layers=this.layers,this.add(r);const a=new sn(yi,bi,t,e);a.layers=this.layers,this.add(a);const o=new sn(yi,bi,t,e);o.layers=this.layers,this.add(o);const l=new sn(yi,bi,t,e);l.layers=this.layers,this.add(l);const c=new sn(yi,bi,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,s,r,a,o,l]=e;for(const c of e)this.remove(c);if(t===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,a,o,l,c,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),p=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let m=!1;t.isWebGLRenderer===!0?m=t.state.buffers.depth.getReversed():m=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,2,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,3,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.generateMipmaps=_,t.setRenderTarget(n,5,s),m&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(u,d,p),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class du extends sn{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}class fu{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(t){this._document=t,t.hidden!==void 0&&(this._pageVisibilityHandler=pu.bind(this),t.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(t){return this._timescale=t,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(t){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(t!==void 0?t:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function pu(){this._document.hidden===!1&&this.reset()}const Ho=new se;class Zg{constructor(t,e,n=0,s=1/0){this.ray=new Aa(t,e),this.near=n,this.far=s,this.camera=null,this.layers=new wa,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,e.projectionMatrix.elements[14]).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):Yt("Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Ho.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ho),this}intersectObject(t,e=!0,n=[]){return la(t,this,n,e),n.sort(Vo),n}intersectObjects(t,e=!0,n=[]){for(let s=0,r=t.length;s<r;s++)la(t[s],this,n,e);return n.sort(Vo),n}}function Vo(i,t){return i.distance-t.distance}function la(i,t,e,n){let s=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(s=!1),s===!0&&n===!0){const r=i.children;for(let a=0,o=r.length;a<o;a++)la(r[a],t,e,!0)}}class Qg{constructor(t=!0){this.autoStart=t,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,Dt("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let t=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const e=performance.now();t=(e-this.oldTime)/1e3,this.oldTime=e,this.elapsedTime+=t}return t}}const Ja=class Ja{constructor(t,e,n,s){this.elements=[1,0,0,1],t!==void 0&&this.set(t,e,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(t,e=0){for(let n=0;n<4;n++)this.elements[n]=t[n+e];return this}set(t,e,n,s){const r=this.elements;return r[0]=t,r[2]=e,r[1]=n,r[3]=s,this}};Ja.prototype.isMatrix2=!0;let Wo=Ja;function Xo(i,t,e,n){const s=mu(n);switch(e){case 1021:return i*t;case 1028:return i*t/s.components*s.byteLength;case 1029:return i*t/s.components*s.byteLength;case 1030:return i*t*2/s.components*s.byteLength;case 1031:return i*t*2/s.components*s.byteLength;case 1022:return i*t*3/s.components*s.byteLength;case 1023:return i*t*4/s.components*s.byteLength;case 1033:return i*t*4/s.components*s.byteLength;case 33776:case 33777:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case 33778:case 33779:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case 35841:case 35843:return Math.max(i,16)*Math.max(t,8)/4;case 35840:case 35842:return Math.max(i,8)*Math.max(t,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case 37808:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case 37809:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case 37810:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case 37811:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case 37812:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case 37813:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case 37814:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case 37815:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case 37816:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case 37817:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case 37818:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case 37819:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case 37820:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case 37821:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(i/4)*Math.ceil(t/4)*16;case 36283:case 36284:return Math.ceil(i/4)*Math.ceil(t/4)*8;case 36285:case 36286:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function mu(i){switch(i){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Dt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function uc(){let i=null,t=!1,e=null,n=null;function s(r,a){n=i.requestAnimationFrame(s),e(r,a)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function gu(i){const t=new WeakMap;function e(o,l){const c=o.array,h=o.usage,u=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,h),o.onUploadCallback();let p;if(c instanceof Float32Array)p=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?p=i.HALF_FLOAT:p=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=i.SHORT;else if(c instanceof Uint32Array)p=i.UNSIGNED_INT;else if(c instanceof Int32Array)p=i.INT;else if(c instanceof Int8Array)p=i.BYTE;else if(c instanceof Uint8Array)p=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,l,c){const h=l.array,u=l.updateRanges;if(i.bindBuffer(c,o),u.length===0)i.bufferSubData(c,0,h);else{u.sort((p,g)=>p.start-g.start);let d=0;for(let p=1;p<u.length;p++){const g=u[d],_=u[p];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,u[d]=_)}u.length=d+1;for(let p=0,g=u.length;p<g;p++){const _=u[p];i.bufferSubData(c,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=t.get(o);l&&(i.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:s,remove:r,update:a}}var _u=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,vu=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,xu=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Mu=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Su=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,yu=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,bu=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Tu=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Eu=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,wu=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Au=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Cu=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Ru=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Pu=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Lu=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Du=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Iu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Uu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Nu=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Fu=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Ou=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,ku=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Bu=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,zu=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Gu=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Hu=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Vu=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Wu=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Xu=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,$u=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,qu="gl_FragColor = linearToOutputTexel( gl_FragColor );",Yu=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Ku=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Ju=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Zu=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Qu=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ju=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,td=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,ed=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,nd=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,id=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,sd=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,rd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,ad=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,od=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,ld=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,cd=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,hd=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ud=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,dd=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,fd=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,pd=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,md=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,gd=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,_d=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,vd=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,xd=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Md=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Sd=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,yd=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,bd=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Td=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Ed=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,wd=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Ad=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Cd=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Rd=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Pd=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Ld=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Dd=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Id=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Ud=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Nd=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Fd=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Od=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,kd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Bd=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,zd=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Gd=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Hd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Vd=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Wd=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Xd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,$d=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,qd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Yd=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Kd=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Jd=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Zd=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Qd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,jd=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,tf=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,ef=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,nf=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,sf=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,rf=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,af=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,of=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,lf=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,cf=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,hf=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,uf=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,df=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,ff=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,pf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,mf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,gf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,_f=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const vf=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,xf=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Mf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Sf=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,yf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,bf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Tf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Ef=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,wf=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Af=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Cf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Rf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Pf=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Lf=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Df=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,If=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Uf=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Nf=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ff=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Of=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kf=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Bf=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,zf=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Gf=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Hf=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Vf=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Wf=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Xf=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,$f=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,qf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Yf=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Kf=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Jf=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Zf=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,zt={alphahash_fragment:_u,alphahash_pars_fragment:vu,alphamap_fragment:xu,alphamap_pars_fragment:Mu,alphatest_fragment:Su,alphatest_pars_fragment:yu,aomap_fragment:bu,aomap_pars_fragment:Tu,batching_pars_vertex:Eu,batching_vertex:wu,begin_vertex:Au,beginnormal_vertex:Cu,bsdfs:Ru,iridescence_fragment:Pu,bumpmap_pars_fragment:Lu,clipping_planes_fragment:Du,clipping_planes_pars_fragment:Iu,clipping_planes_pars_vertex:Uu,clipping_planes_vertex:Nu,color_fragment:Fu,color_pars_fragment:Ou,color_pars_vertex:ku,color_vertex:Bu,common:zu,cube_uv_reflection_fragment:Gu,defaultnormal_vertex:Hu,displacementmap_pars_vertex:Vu,displacementmap_vertex:Wu,emissivemap_fragment:Xu,emissivemap_pars_fragment:$u,colorspace_fragment:qu,colorspace_pars_fragment:Yu,envmap_fragment:Ku,envmap_common_pars_fragment:Ju,envmap_pars_fragment:Zu,envmap_pars_vertex:Qu,envmap_physical_pars_fragment:cd,envmap_vertex:ju,fog_vertex:td,fog_pars_vertex:ed,fog_fragment:nd,fog_pars_fragment:id,gradientmap_pars_fragment:sd,lightmap_pars_fragment:rd,lights_lambert_fragment:ad,lights_lambert_pars_fragment:od,lights_pars_begin:ld,lights_toon_fragment:hd,lights_toon_pars_fragment:ud,lights_phong_fragment:dd,lights_phong_pars_fragment:fd,lights_physical_fragment:pd,lights_physical_pars_fragment:md,lights_fragment_begin:gd,lights_fragment_maps:_d,lights_fragment_end:vd,lightprobes_pars_fragment:xd,logdepthbuf_fragment:Md,logdepthbuf_pars_fragment:Sd,logdepthbuf_pars_vertex:yd,logdepthbuf_vertex:bd,map_fragment:Td,map_pars_fragment:Ed,map_particle_fragment:wd,map_particle_pars_fragment:Ad,metalnessmap_fragment:Cd,metalnessmap_pars_fragment:Rd,morphinstance_vertex:Pd,morphcolor_vertex:Ld,morphnormal_vertex:Dd,morphtarget_pars_vertex:Id,morphtarget_vertex:Ud,normal_fragment_begin:Nd,normal_fragment_maps:Fd,normal_pars_fragment:Od,normal_pars_vertex:kd,normal_vertex:Bd,normalmap_pars_fragment:zd,clearcoat_normal_fragment_begin:Gd,clearcoat_normal_fragment_maps:Hd,clearcoat_pars_fragment:Vd,iridescence_pars_fragment:Wd,opaque_fragment:Xd,packing:$d,premultiplied_alpha_fragment:qd,project_vertex:Yd,dithering_fragment:Kd,dithering_pars_fragment:Jd,roughnessmap_fragment:Zd,roughnessmap_pars_fragment:Qd,shadowmap_pars_fragment:jd,shadowmap_pars_vertex:tf,shadowmap_vertex:ef,shadowmask_pars_fragment:nf,skinbase_vertex:sf,skinning_pars_vertex:rf,skinning_vertex:af,skinnormal_vertex:of,specularmap_fragment:lf,specularmap_pars_fragment:cf,tonemapping_fragment:hf,tonemapping_pars_fragment:uf,transmission_fragment:df,transmission_pars_fragment:ff,uv_pars_fragment:pf,uv_pars_vertex:mf,uv_vertex:gf,worldpos_vertex:_f,background_vert:vf,background_frag:xf,backgroundCube_vert:Mf,backgroundCube_frag:Sf,cube_vert:yf,cube_frag:bf,depth_vert:Tf,depth_frag:Ef,distance_vert:wf,distance_frag:Af,equirect_vert:Cf,equirect_frag:Rf,linedashed_vert:Pf,linedashed_frag:Lf,meshbasic_vert:Df,meshbasic_frag:If,meshlambert_vert:Uf,meshlambert_frag:Nf,meshmatcap_vert:Ff,meshmatcap_frag:Of,meshnormal_vert:kf,meshnormal_frag:Bf,meshphong_vert:zf,meshphong_frag:Gf,meshphysical_vert:Hf,meshphysical_frag:Vf,meshtoon_vert:Wf,meshtoon_frag:Xf,points_vert:$f,points_frag:qf,shadow_vert:Yf,shadow_frag:Kf,sprite_vert:Jf,sprite_frag:Zf},ft={common:{diffuse:{value:new It(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ft},alphaMap:{value:null},alphaMapTransform:{value:new Ft},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ft}},envmap:{envMap:{value:null},envMapRotation:{value:new Ft},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ft}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ft}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ft},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ft},normalScale:{value:new ut(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ft},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ft}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ft}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ft}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new It(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new D},probesMax:{value:new D},probesResolution:{value:new D}},points:{diffuse:{value:new It(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ft},alphaTest:{value:0},uvTransform:{value:new Ft}},sprite:{diffuse:{value:new It(16777215)},opacity:{value:1},center:{value:new ut(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ft},alphaMap:{value:null},alphaMapTransform:{value:new Ft},alphaTest:{value:0}}},xn={basic:{uniforms:Ve([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.fog]),vertexShader:zt.meshbasic_vert,fragmentShader:zt.meshbasic_frag},lambert:{uniforms:Ve([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,ft.lights,{emissive:{value:new It(0)},envMapIntensity:{value:1}}]),vertexShader:zt.meshlambert_vert,fragmentShader:zt.meshlambert_frag},phong:{uniforms:Ve([ft.common,ft.specularmap,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,ft.lights,{emissive:{value:new It(0)},specular:{value:new It(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:zt.meshphong_vert,fragmentShader:zt.meshphong_frag},standard:{uniforms:Ve([ft.common,ft.envmap,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.roughnessmap,ft.metalnessmap,ft.fog,ft.lights,{emissive:{value:new It(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:zt.meshphysical_vert,fragmentShader:zt.meshphysical_frag},toon:{uniforms:Ve([ft.common,ft.aomap,ft.lightmap,ft.emissivemap,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.gradientmap,ft.fog,ft.lights,{emissive:{value:new It(0)}}]),vertexShader:zt.meshtoon_vert,fragmentShader:zt.meshtoon_frag},matcap:{uniforms:Ve([ft.common,ft.bumpmap,ft.normalmap,ft.displacementmap,ft.fog,{matcap:{value:null}}]),vertexShader:zt.meshmatcap_vert,fragmentShader:zt.meshmatcap_frag},points:{uniforms:Ve([ft.points,ft.fog]),vertexShader:zt.points_vert,fragmentShader:zt.points_frag},dashed:{uniforms:Ve([ft.common,ft.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:zt.linedashed_vert,fragmentShader:zt.linedashed_frag},depth:{uniforms:Ve([ft.common,ft.displacementmap]),vertexShader:zt.depth_vert,fragmentShader:zt.depth_frag},normal:{uniforms:Ve([ft.common,ft.bumpmap,ft.normalmap,ft.displacementmap,{opacity:{value:1}}]),vertexShader:zt.meshnormal_vert,fragmentShader:zt.meshnormal_frag},sprite:{uniforms:Ve([ft.sprite,ft.fog]),vertexShader:zt.sprite_vert,fragmentShader:zt.sprite_frag},background:{uniforms:{uvTransform:{value:new Ft},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:zt.background_vert,fragmentShader:zt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ft}},vertexShader:zt.backgroundCube_vert,fragmentShader:zt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:zt.cube_vert,fragmentShader:zt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:zt.equirect_vert,fragmentShader:zt.equirect_frag},distance:{uniforms:Ve([ft.common,ft.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:zt.distance_vert,fragmentShader:zt.distance_frag},shadow:{uniforms:Ve([ft.lights,ft.fog,{color:{value:new It(0)},opacity:{value:1}}]),vertexShader:zt.shadow_vert,fragmentShader:zt.shadow_frag}};xn.physical={uniforms:Ve([xn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ft},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ft},clearcoatNormalScale:{value:new ut(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ft},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ft},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ft},sheen:{value:0},sheenColor:{value:new It(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ft},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ft},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ft},transmissionSamplerSize:{value:new ut},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ft},attenuationDistance:{value:0},attenuationColor:{value:new It(0)},specularColor:{value:new It(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ft},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ft},anisotropyVector:{value:new ut},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ft}}]),vertexShader:zt.meshphysical_vert,fragmentShader:zt.meshphysical_frag};const zs={r:0,b:0,g:0},Qf=new se,dc=new Ft;dc.set(-1,0,0,0,1,0,0,0,1);function jf(i,t,e,n,s,r){const a=new It(0);let o=s===!0?0:1,l,c,h=null,u=0,d=null;function p(v){let T=v.isScene===!0?v.background:null;if(T&&T.isTexture){const S=v.backgroundBlurriness>0;T=t.get(T,S)}return T}function g(v){let T=!1;const S=p(v);S===null?m(a,o):S&&S.isColor&&(m(S,1),T=!0);const E=i.xr.getEnvironmentBlendMode();E==="additive"?e.buffers.color.setClear(0,0,0,1,r):E==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||T)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function _(v,T){const S=p(T);S&&(S.isCubeTexture||S.mapping===306)?(c===void 0&&(c=new pt(new fe(1,1,1),new Ae({name:"BackgroundCubeMaterial",uniforms:Di(xn.backgroundCube.uniforms),vertexShader:xn.backgroundCube.vertexShader,fragmentShader:xn.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(E,y,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=S,c.material.uniforms.backgroundBlurriness.value=T.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Qf.makeRotationFromEuler(T.backgroundRotation)).transpose(),S.isCubeTexture&&S.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(dc),c.material.toneMapped=$t.getTransfer(S.colorSpace)!==ee,(h!==S||u!==S.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,h=S,u=S.version,d=i.toneMapping),c.layers.enableAll(),v.unshift(c,c.geometry,c.material,0,0,null)):S&&S.isTexture&&(l===void 0&&(l=new pt(new Ln(2,2),new Ae({name:"BackgroundMaterial",uniforms:Di(xn.background.uniforms),vertexShader:xn.background.vertexShader,fragmentShader:xn.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=S,l.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,l.material.toneMapped=$t.getTransfer(S.colorSpace)!==ee,S.matrixAutoUpdate===!0&&S.updateMatrix(),l.material.uniforms.uvTransform.value.copy(S.matrix),(h!==S||u!==S.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,h=S,u=S.version,d=i.toneMapping),l.layers.enableAll(),v.unshift(l,l.geometry,l.material,0,0,null))}function m(v,T){v.getRGB(zs,oc(i)),e.buffers.color.setClear(zs.r,zs.g,zs.b,T,r)}function f(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(v,T=1){a.set(v),o=T,m(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(v){o=v,m(a,o)},render:g,addToRenderList:_,dispose:f}}function tp(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null);let r=s,a=!1;function o(I,A,U,L,k){let $=!1;const H=u(I,L,U,A);r!==H&&(r=H,c(r.object)),$=p(I,L,U,k),$&&g(I,L,U,k),k!==null&&t.update(k,i.ELEMENT_ARRAY_BUFFER),($||a)&&(a=!1,S(I,A,U,L),k!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(k).buffer))}function l(){return i.createVertexArray()}function c(I){return i.bindVertexArray(I)}function h(I){return i.deleteVertexArray(I)}function u(I,A,U,L){const k=L.wireframe===!0;let $=n[A.id];$===void 0&&($={},n[A.id]=$);const H=I.isInstancedMesh===!0?I.id:0;let j=$[H];j===void 0&&(j={},$[H]=j);let X=j[U.id];X===void 0&&(X={},j[U.id]=X);let tt=X[k];return tt===void 0&&(tt=d(l()),X[k]=tt),tt}function d(I){const A=[],U=[],L=[];for(let k=0;k<e;k++)A[k]=0,U[k]=0,L[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:A,enabledAttributes:U,attributeDivisors:L,object:I,attributes:{},index:null}}function p(I,A,U,L){const k=r.attributes,$=A.attributes;let H=0;const j=U.getAttributes();for(const X in j)if(j[X].location>=0){const et=k[X];let yt=$[X];if(yt===void 0&&(X==="instanceMatrix"&&I.instanceMatrix&&(yt=I.instanceMatrix),X==="instanceColor"&&I.instanceColor&&(yt=I.instanceColor)),et===void 0||et.attribute!==yt||yt&&et.data!==yt.data)return!0;H++}return r.attributesNum!==H||r.index!==L}function g(I,A,U,L){const k={},$=A.attributes;let H=0;const j=U.getAttributes();for(const X in j)if(j[X].location>=0){let et=$[X];et===void 0&&(X==="instanceMatrix"&&I.instanceMatrix&&(et=I.instanceMatrix),X==="instanceColor"&&I.instanceColor&&(et=I.instanceColor));const yt={};yt.attribute=et,et&&et.data&&(yt.data=et.data),k[X]=yt,H++}r.attributes=k,r.attributesNum=H,r.index=L}function _(){const I=r.newAttributes;for(let A=0,U=I.length;A<U;A++)I[A]=0}function m(I){f(I,0)}function f(I,A){const U=r.newAttributes,L=r.enabledAttributes,k=r.attributeDivisors;U[I]=1,L[I]===0&&(i.enableVertexAttribArray(I),L[I]=1),k[I]!==A&&(i.vertexAttribDivisor(I,A),k[I]=A)}function v(){const I=r.newAttributes,A=r.enabledAttributes;for(let U=0,L=A.length;U<L;U++)A[U]!==I[U]&&(i.disableVertexAttribArray(U),A[U]=0)}function T(I,A,U,L,k,$,H){H===!0?i.vertexAttribIPointer(I,A,U,k,$):i.vertexAttribPointer(I,A,U,L,k,$)}function S(I,A,U,L){_();const k=L.attributes,$=U.getAttributes(),H=A.defaultAttributeValues;for(const j in $){const X=$[j];if(X.location>=0){let tt=k[j];if(tt===void 0&&(j==="instanceMatrix"&&I.instanceMatrix&&(tt=I.instanceMatrix),j==="instanceColor"&&I.instanceColor&&(tt=I.instanceColor)),tt!==void 0){const et=tt.normalized,yt=tt.itemSize,wt=t.get(tt);if(wt===void 0)continue;const ne=wt.buffer,kt=wt.type,qt=wt.bytesPerElement,Y=kt===i.INT||kt===i.UNSIGNED_INT||tt.gpuType===1013;if(tt.isInterleavedBufferAttribute){const it=tt.data,St=it.stride,Nt=tt.offset;if(it.isInstancedInterleavedBuffer){for(let xt=0;xt<X.locationSize;xt++)f(X.location+xt,it.meshPerAttribute);I.isInstancedMesh!==!0&&L._maxInstanceCount===void 0&&(L._maxInstanceCount=it.meshPerAttribute*it.count)}else for(let xt=0;xt<X.locationSize;xt++)m(X.location+xt);i.bindBuffer(i.ARRAY_BUFFER,ne);for(let xt=0;xt<X.locationSize;xt++)T(X.location+xt,yt/X.locationSize,kt,et,St*qt,(Nt+yt/X.locationSize*xt)*qt,Y)}else{if(tt.isInstancedBufferAttribute){for(let it=0;it<X.locationSize;it++)f(X.location+it,tt.meshPerAttribute);I.isInstancedMesh!==!0&&L._maxInstanceCount===void 0&&(L._maxInstanceCount=tt.meshPerAttribute*tt.count)}else for(let it=0;it<X.locationSize;it++)m(X.location+it);i.bindBuffer(i.ARRAY_BUFFER,ne);for(let it=0;it<X.locationSize;it++)T(X.location+it,yt/X.locationSize,kt,et,yt*qt,yt/X.locationSize*it*qt,Y)}}else if(H!==void 0){const et=H[j];if(et!==void 0)switch(et.length){case 2:i.vertexAttrib2fv(X.location,et);break;case 3:i.vertexAttrib3fv(X.location,et);break;case 4:i.vertexAttrib4fv(X.location,et);break;default:i.vertexAttrib1fv(X.location,et)}}}}v()}function E(){w();for(const I in n){const A=n[I];for(const U in A){const L=A[U];for(const k in L){const $=L[k];for(const H in $)h($[H].object),delete $[H];delete L[k]}}delete n[I]}}function y(I){if(n[I.id]===void 0)return;const A=n[I.id];for(const U in A){const L=A[U];for(const k in L){const $=L[k];for(const H in $)h($[H].object),delete $[H];delete L[k]}}delete n[I.id]}function R(I){for(const A in n){const U=n[A];for(const L in U){const k=U[L];if(k[I.id]===void 0)continue;const $=k[I.id];for(const H in $)h($[H].object),delete $[H];delete k[I.id]}}}function x(I){for(const A in n){const U=n[A],L=I.isInstancedMesh===!0?I.id:0,k=U[L];if(k!==void 0){for(const $ in k){const H=k[$];for(const j in H)h(H[j].object),delete H[j];delete k[$]}delete U[L],Object.keys(U).length===0&&delete n[A]}}}function w(){C(),a=!0,r!==s&&(r=s,c(r.object))}function C(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:w,resetDefaultState:C,dispose:E,releaseStatesOfGeometry:y,releaseStatesOfObject:x,releaseStatesOfProgram:R,initAttributes:_,enableAttribute:m,disableUnusedAttributes:v}}function ep(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function a(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function o(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let d=0;for(let p=0;p<h;p++)d+=c[p];e.update(d,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function np(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const R=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(R){return!(R!==1023&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(R){const x=R===1016&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(R!==1009&&R!==1015&&!x&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(R){if(R==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(Dt("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=e.logarithmicDepthBuffer===!0,d=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control");e.reversedDepthBuffer===!0&&d===!1&&Dt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const p=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),f=i.getParameter(i.MAX_VERTEX_ATTRIBS),v=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),T=i.getParameter(i.MAX_VARYING_VECTORS),S=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),E=i.getParameter(i.MAX_SAMPLES),y=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:f,maxVertexUniforms:v,maxVaryings:T,maxFragmentUniforms:S,maxSamples:E,samples:y}}function ip(i){const t=this;let e=null,n=0,s=!1,r=!1;const a=new Vn,o=new Ft,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const p=u.length!==0||d||n!==0||s;return s=d,n=u.length,p},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,p){const g=u.clippingPlanes,_=u.clipIntersection,m=u.clipShadows,f=i.get(u);if(!s||g===null||g.length===0||r&&!m)r?h(null):c();else{const v=r?0:n,T=v*4;let S=f.clippingState||null;l.value=S,S=h(g,d,T,p);for(let E=0;E!==T;++E)S[E]=e[E];f.clippingState=S,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=v}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(u,d,p,g){const _=u!==null?u.length:0;let m=null;if(_!==0){if(m=l.value,g!==!0||m===null){const f=p+_*4,v=d.matrixWorldInverse;o.getNormalMatrix(v),(m===null||m.length<f)&&(m=new Float32Array(f));for(let T=0,S=p;T!==_;++T,S+=4)a.copy(u[T]).applyMatrix4(v,o),a.normal.toArray(m,S),m[S+3]=a.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,m}}const Ri=4,sp=6,rp=20,ap=256,Ki=new cr,$o=new It;let Xr=null,$r=0,qr=0,Yr=!1;const op=new D,jn=new D;class qo{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){const{size:a=256,position:o=op}=r;Xr=this._renderer.getRenderTarget(),$r=this._renderer.getActiveCubeFace(),qr=this._renderer.getActiveMipmapLevel(),Yr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,n,s,l,o),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Jo(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ko(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(Xr,$r,qr),this._renderer.xr.enabled=Yr,t.scissorTest=!1,Ti(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===301||t.mapping===302?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Xr=this._renderer.getRenderTarget(),$r=this._renderer.getActiveCubeFace(),qr=this._renderer.getActiveMipmapLevel(),Yr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,colorSpace:Zs,depthBuffer:!1},s=Yo(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Yo(t,e,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=lp(r)),this._blurMaterial=hp(r,t,e),this._ggxMaterial=cp(r,t,e)}return s}_compileMaterial(t){const e=new pt(new De,t);this._renderer.compile(e,Ki)}_sceneToCubeUV(t,e,n,s,r){const l=new sn(90,1,e,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,p=u.toneMapping;u.getClearColor($o),u.toneMapping=0,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new pt(new fe,new qe({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1})));const _=this._backgroundBox,m=_.material;let f=!1;const v=t.background;v?v.isColor&&(m.color.copy(v),t.background=null,f=!0):(m.color.copy($o),f=!0);for(let T=0;T<6;T++){const S=T%3;S===0?(l.up.set(0,c[T],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[T],r.y,r.z)):S===1?(l.up.set(0,0,c[T]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[T],r.z)):(l.up.set(0,c[T],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[T]));const E=this._cubeSize;Ti(s,S*E,T>2?E:0,E,E),u.setRenderTarget(s),f&&u.render(_,l),u.render(t,l)}u.toneMapping=p,u.autoClear=d,t.background=v}_textureToCubeUV(t,e){const n=this._renderer,s=t.mapping===301||t.mapping===302;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Jo()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ko());const r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;const o=r.uniforms;o.envMap.value=t;const l=this._cubeSize;Ti(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,Ki)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=n}_applyGGXFilter(t,e,n){const s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;const l=a.uniforms,c=n/(this._lodMeshes.length-1),h=e/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=c*1.25,p=u*d,{_lodMax:g}=this,_=this._sizeLods[n],m=3*_*(n>g-Ri?n-g+Ri:0),f=4*(this._cubeSize-_);l.envMap.value=t.texture,l.roughness.value=p,l.mipInt.value=g-e,Ti(r,m,f,3*_,2*_),s.setRenderTarget(r),s.render(o,Ki),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,Ti(t,m,f,3*_,2*_),s.setRenderTarget(t),s.render(o,Ki)}_blur(t,e,n,s){const r=this._pingPongRenderTarget,a=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(t,r,e,n,a),this._blurPass(r,t,n,n,a)}_blurPass(t,e,n,s,r){const a=this._renderer,o=this._blurMaterial,l=this._lodMeshes[s];l.material=o;const c=o.uniforms;c.envMap.value=t.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;const h=this._sizeLods[s],u=3*h*(s>this._lodMax-Ri?s-this._lodMax+Ri:0),d=4*(this._cubeSize-h);Ti(e,u,d,3*h,2*h),a.setRenderTarget(e),a.render(l,Ki)}}function lp(i){const t=[],e=[];let n=i;const s=i-Ri+1+sp;for(let r=0;r<s;r++){const a=Math.pow(2,n);t.push(a);const o=1/(a-2),l=-o,c=1+o,h=[l,l,c,l,c,c,l,l,c,c,l,c],u=6,d=6,p=3,g=new Float32Array(p*d*u),_=new Float32Array(p*d*u);for(let f=0;f<u;f++){const v=f%3*2/3-1,T=f>2?0:-1,S=[v,T,0,v+2/3,T,0,v+2/3,T+1,0,v,T,0,v+2/3,T+1,0,v,T+1,0];g.set(S,p*d*f);for(let E=0;E<d;E++){const y=h[E*2]*2-1,R=h[E*2+1]*2-1;f===0?jn.set(1,R,y):f===1?jn.set(-y,1,-R):f===2?jn.set(-y,R,1):f===3?jn.set(-1,R,-y):f===4?jn.set(-y,-1,R):jn.set(y,R,-1),jn.toArray(_,(f*d+E)*p)}}const m=new De;m.setAttribute("position",new un(g,p)),m.setAttribute("outputDirection",new un(_,p)),e.push(new pt(m,null)),n>Ri&&n--}return{lodMeshes:e,sizeLods:t}}function Yo(i,t,e){const n=new We(i,t,e);return n.texture.mapping=306,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Ti(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function cp(i,t,e){return new Ae({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:ap,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:hr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function hp(i,t,e){return new Ae({name:"SphericalGaussianBlur",defines:{SAMPLES:rp,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:hr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Ko(){return new Ae({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:hr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Jo(){return new Ae({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:hr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function hr(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}class fc extends We{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new ec(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new fe(5,5,5),r=new Ae({name:"CubemapFromEquirect",uniforms:Di(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});r.uniforms.tEquirect.value=e;const a=new pt(s,r),o=e.minFilter;return e.minFilter===1008&&(e.minFilter=1006),new uu(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){const r=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,s);t.setRenderTarget(r)}}function up(i){let t=new WeakMap,e=new WeakMap,n=null;function s(d,p=!1){return d==null?null:p?a(d):r(d)}function r(d){if(d&&d.isTexture){const p=d.mapping;if(p===303||p===304)if(t.has(d)){const g=t.get(d).texture;return o(g,d.mapping)}else{const g=d.image;if(g&&g.height>0){const _=new fc(g.height);return _.fromEquirectangularTexture(i,d),t.set(d,_),d.addEventListener("dispose",c),o(_.texture,d.mapping)}else return null}}return d}function a(d){if(d&&d.isTexture){const p=d.mapping,g=p===303||p===304,_=p===301||p===302;if(g||_){let m=e.get(d);const f=m!==void 0?m.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==f)return n===null&&(n=new qo(i)),m=g?n.fromEquirectangular(d,m):n.fromCubemap(d,m),m.texture.pmremVersion=d.pmremVersion,e.set(d,m),m.texture;if(m!==void 0)return m.texture;{const v=d.image;return g&&v&&v.height>0||_&&v&&l(v)?(n===null&&(n=new qo(i)),m=g?n.fromEquirectangular(d):n.fromCubemap(d),m.texture.pmremVersion=d.pmremVersion,e.set(d,m),d.addEventListener("dispose",h),m.texture):null}}}return d}function o(d,p){return p===303?d.mapping=301:p===304&&(d.mapping=302),d}function l(d){let p=0;const g=6;for(let _=0;_<g;_++)d[_]!==void 0&&p++;return p===g}function c(d){const p=d.target;p.removeEventListener("dispose",c);const g=t.get(p);g!==void 0&&(t.delete(p),g.dispose())}function h(d){const p=d.target;p.removeEventListener("dispose",h);const g=e.get(p);g!==void 0&&(e.delete(p),g.dispose())}function u(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:u}}function dp(i){const t={};function e(n){if(t[n]!==void 0)return t[n];const s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const s=e(n);return s===null&&Pi("WebGLRenderer: "+n+" extension not supported."),s}}}function fp(i,t,e,n){const s={},r=new WeakMap;function a(u){const d=u.target;d.index!==null&&t.remove(d.index);for(const g in d.attributes)t.remove(d.attributes[g]);d.removeEventListener("dispose",a),delete s[d.id];const p=r.get(d);p&&(t.remove(p),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,e.memory.geometries--}function o(u,d){return s[d.id]===!0||(d.addEventListener("dispose",a),s[d.id]=!0,e.memory.geometries++),d}function l(u){const d=u.attributes;for(const p in d)t.update(d[p],i.ARRAY_BUFFER)}function c(u){const d=[],p=u.index,g=u.attributes.position;let _=0;if(g===void 0)return;if(p!==null){const v=p.array;_=p.version;for(let T=0,S=v.length;T<S;T+=3){const E=v[T+0],y=v[T+1],R=v[T+2];d.push(E,y,y,R,R,E)}}else{const v=g.array;_=g.version;for(let T=0,S=v.length/3-1;T<S;T+=3){const E=T+0,y=T+1,R=T+2;d.push(E,y,y,R,R,E)}}const m=new(g.count>=65535?Zl:Jl)(d,1);m.version=_;const f=r.get(u);f&&t.remove(f),r.set(u,m)}function h(u){const d=r.get(u);if(d){const p=u.index;p!==null&&d.version<p.version&&c(u)}else c(u);return r.get(u)}return{get:o,update:l,getWireframeAttribute:h}}function pp(i,t,e){let n;function s(u){n=u}let r,a;function o(u){r=u.type,a=u.bytesPerElement}function l(u,d){i.drawElements(n,d,r,u*a),e.update(d,n,1)}function c(u,d,p){p!==0&&(i.drawElementsInstanced(n,d,r,u*a,p),e.update(d,n,p))}function h(u,d,p){if(p===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,r,u,0,p);let _=0;for(let m=0;m<p;m++)_+=d[m];e.update(_,n,1)}this.setMode=s,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function mp(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(r/3);break;case i.LINES:e.lines+=o*(r/2);break;case i.LINE_STRIP:e.lines+=o*(r-1);break;case i.LINE_LOOP:e.lines+=o*r;break;case i.POINTS:e.points+=o*r;break;default:Yt("WebGLInfo: Unknown draw mode:",a);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function gp(i,t,e){const n=new WeakMap,s=new pe;function r(a,o,l){const c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(o);if(d===void 0||d.count!==u){let w=function(){R.dispose(),n.delete(o),o.removeEventListener("dispose",w)};d!==void 0&&d.texture.dispose();const p=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],f=o.morphAttributes.normal||[],v=o.morphAttributes.color||[];let T=0;p===!0&&(T=1),g===!0&&(T=2),_===!0&&(T=3);let S=o.attributes.position.count*T,E=1;S>t.maxTextureSize&&(E=Math.ceil(S/t.maxTextureSize),S=t.maxTextureSize);const y=new Float32Array(S*E*4*u),R=new ql(y,S,E,u);R.type=1015,R.needsUpdate=!0;const x=T*4;for(let C=0;C<u;C++){const I=m[C],A=f[C],U=v[C],L=S*E*4*C;for(let k=0;k<I.count;k++){const $=k*x;p===!0&&(s.fromBufferAttribute(I,k),y[L+$+0]=s.x,y[L+$+1]=s.y,y[L+$+2]=s.z,y[L+$+3]=0),g===!0&&(s.fromBufferAttribute(A,k),y[L+$+4]=s.x,y[L+$+5]=s.y,y[L+$+6]=s.z,y[L+$+7]=0),_===!0&&(s.fromBufferAttribute(U,k),y[L+$+8]=s.x,y[L+$+9]=s.y,y[L+$+10]=s.z,y[L+$+11]=U.itemSize===4?s.w:1)}}d={count:u,texture:R,size:new ut(S,E)},n.set(o,d),o.addEventListener("dispose",w)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let p=0;for(let _=0;_<c.length;_++)p+=c[_];const g=o.morphTargetsRelative?1:1-p;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function _p(i,t,e,n,s){let r=new WeakMap;function a(c){const h=s.render.frame,u=c.geometry,d=t.get(c,u);if(r.get(d)!==h&&(t.update(d),r.set(d,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){const p=c.skeleton;r.get(p)!==h&&(p.update(),r.set(p,h))}return d}function o(){r=new WeakMap}function l(c){const h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:a,dispose:o}}const vp={1:"LINEAR_TONE_MAPPING",2:"REINHARD_TONE_MAPPING",3:"CINEON_TONE_MAPPING",4:"ACES_FILMIC_TONE_MAPPING",6:"AGX_TONE_MAPPING",7:"NEUTRAL_TONE_MAPPING",5:"CUSTOM_TONE_MAPPING"};function xp(i,t,e,n,s,r){const a=new We(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1});let o=null,l=null;const c=new De;c.setAttribute("position",new Qt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Qt([0,2,0,0,2,0],2));const h=new lc({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new pt(c,h),d=new cr(-1,1,1,-1,0,1);let p=null,g=null,_=!1,m,f=null,v=[],T=!1;this.setSize=function(S,E){a.setSize(S,E),o!==null&&o.setSize(S,E),l!==null&&l.setSize(S,E);for(let y=0;y<v.length;y++){const R=v[y];R.setSize&&R.setSize(S,E)}},this.setEffects=function(S){v=S,T=v.length>0&&v[0].isRenderPass===!0;const E=a.width,y=a.height;v.length>0&&o===null&&(o=new We(E,y,{type:1016,depthBuffer:!1,stencilBuffer:!1}),l=new We(E,y,{type:1016,depthBuffer:!1,stencilBuffer:!1}));for(let R=0;R<v.length;R++){const x=v[R];x.setSize&&x.setSize(E,y)}},this.begin=function(S,E){if(_||S.toneMapping===0&&v.length===0)return!1;if(f=E,E!==null){const y=E.width,R=E.height;(a.width!==y||a.height!==R)&&this.setSize(y,R)}return T===!1&&S.setRenderTarget(a),m=S.toneMapping,S.toneMapping=0,!0},this.hasRenderPass=function(){return T},this.end=function(S,E){S.toneMapping=m,_=!0;let y=a,R=o;for(let x=0;x<v.length;x++){const w=v[x];w.enabled!==!1&&(w.render(S,R,y,E),w.needsSwap!==!1&&(y=R,R=R===o?l:o))}if(p!==S.outputColorSpace||g!==S.toneMapping){p=S.outputColorSpace,g=S.toneMapping,h.defines={},$t.getTransfer(p)===ee&&(h.defines.SRGB_TRANSFER="");const x=vp[g];x&&(h.defines[x]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=y.texture,S.setRenderTarget(f),S.render(u,d),f=null,_=!1},this.isCompositing=function(){return _},this.dispose=function(){a.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}const pc=new Ne,ca=new is(1,1),mc=new ql,gc=new fh,_c=new ec,Zo=[],Qo=[],jo=new Float32Array(16),tl=new Float32Array(9),el=new Float32Array(4);function Oi(i,t,e){const n=i[0];if(n<=0||n>0)return i;const s=t*e;let r=Zo[s];if(r===void 0&&(r=new Float32Array(s),Zo[s]=r),t!==0){n.toArray(r,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(r,o)}return r}function Ce(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Re(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function ur(i,t){let e=Qo[t];e===void 0&&(e=new Int32Array(t),Qo[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function Mp(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function Sp(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ce(e,t))return;i.uniform2fv(this.addr,t),Re(e,t)}}function yp(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ce(e,t))return;i.uniform3fv(this.addr,t),Re(e,t)}}function bp(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ce(e,t))return;i.uniform4fv(this.addr,t),Re(e,t)}}function Tp(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ce(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Re(e,t)}else{if(Ce(e,n))return;el.set(n),i.uniformMatrix2fv(this.addr,!1,el),Re(e,n)}}function Ep(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ce(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Re(e,t)}else{if(Ce(e,n))return;tl.set(n),i.uniformMatrix3fv(this.addr,!1,tl),Re(e,n)}}function wp(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ce(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Re(e,t)}else{if(Ce(e,n))return;jo.set(n),i.uniformMatrix4fv(this.addr,!1,jo),Re(e,n)}}function Ap(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function Cp(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ce(e,t))return;i.uniform2iv(this.addr,t),Re(e,t)}}function Rp(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ce(e,t))return;i.uniform3iv(this.addr,t),Re(e,t)}}function Pp(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ce(e,t))return;i.uniform4iv(this.addr,t),Re(e,t)}}function Lp(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function Dp(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ce(e,t))return;i.uniform2uiv(this.addr,t),Re(e,t)}}function Ip(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ce(e,t))return;i.uniform3uiv(this.addr,t),Re(e,t)}}function Up(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ce(e,t))return;i.uniform4uiv(this.addr,t),Re(e,t)}}function Np(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(ca.compareFunction=e.isReversedDepthBuffer()?518:515,r=ca):r=pc,e.setTexture2D(t||r,s)}function Fp(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||gc,s)}function Op(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||_c,s)}function kp(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||mc,s)}function Bp(i){switch(i){case 5126:return Mp;case 35664:return Sp;case 35665:return yp;case 35666:return bp;case 35674:return Tp;case 35675:return Ep;case 35676:return wp;case 5124:case 35670:return Ap;case 35667:case 35671:return Cp;case 35668:case 35672:return Rp;case 35669:case 35673:return Pp;case 5125:return Lp;case 36294:return Dp;case 36295:return Ip;case 36296:return Up;case 35678:case 36198:case 36298:case 36306:case 35682:return Np;case 35679:case 36299:case 36307:return Fp;case 35680:case 36300:case 36308:case 36293:return Op;case 36289:case 36303:case 36311:case 36292:return kp}}function zp(i,t){i.uniform1fv(this.addr,t)}function Gp(i,t){const e=Oi(t,this.size,2);i.uniform2fv(this.addr,e)}function Hp(i,t){const e=Oi(t,this.size,3);i.uniform3fv(this.addr,e)}function Vp(i,t){const e=Oi(t,this.size,4);i.uniform4fv(this.addr,e)}function Wp(i,t){const e=Oi(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function Xp(i,t){const e=Oi(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function $p(i,t){const e=Oi(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function qp(i,t){i.uniform1iv(this.addr,t)}function Yp(i,t){i.uniform2iv(this.addr,t)}function Kp(i,t){i.uniform3iv(this.addr,t)}function Jp(i,t){i.uniform4iv(this.addr,t)}function Zp(i,t){i.uniform1uiv(this.addr,t)}function Qp(i,t){i.uniform2uiv(this.addr,t)}function jp(i,t){i.uniform3uiv(this.addr,t)}function tm(i,t){i.uniform4uiv(this.addr,t)}function em(i,t,e){const n=this.cache,s=t.length,r=ur(e,s);Ce(n,r)||(i.uniform1iv(this.addr,r),Re(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=ca:a=pc;for(let o=0;o!==s;++o)e.setTexture2D(t[o]||a,r[o])}function nm(i,t,e){const n=this.cache,s=t.length,r=ur(e,s);Ce(n,r)||(i.uniform1iv(this.addr,r),Re(n,r));for(let a=0;a!==s;++a)e.setTexture3D(t[a]||gc,r[a])}function im(i,t,e){const n=this.cache,s=t.length,r=ur(e,s);Ce(n,r)||(i.uniform1iv(this.addr,r),Re(n,r));for(let a=0;a!==s;++a)e.setTextureCube(t[a]||_c,r[a])}function sm(i,t,e){const n=this.cache,s=t.length,r=ur(e,s);Ce(n,r)||(i.uniform1iv(this.addr,r),Re(n,r));for(let a=0;a!==s;++a)e.setTexture2DArray(t[a]||mc,r[a])}function rm(i){switch(i){case 5126:return zp;case 35664:return Gp;case 35665:return Hp;case 35666:return Vp;case 35674:return Wp;case 35675:return Xp;case 35676:return $p;case 5124:case 35670:return qp;case 35667:case 35671:return Yp;case 35668:case 35672:return Kp;case 35669:case 35673:return Jp;case 5125:return Zp;case 36294:return Qp;case 36295:return jp;case 36296:return tm;case 35678:case 36198:case 36298:case 36306:case 35682:return em;case 35679:case 36299:case 36307:return nm;case 35680:case 36300:case 36308:case 36293:return im;case 36289:case 36303:case 36311:case 36292:return sm}}class am{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=Bp(e.type)}}class om{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=rm(e.type)}}class lm{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const s=this.seq;for(let r=0,a=s.length;r!==a;++r){const o=s[r];o.setValue(t,e[o.id],n)}}}const Kr=/(\w+)(\])?(\[|\.)?/g;function nl(i,t){i.seq.push(t),i.map[t.id]=t}function cm(i,t,e){const n=i.name,s=n.length;for(Kr.lastIndex=0;;){const r=Kr.exec(n),a=Kr.lastIndex;let o=r[1];const l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===s){nl(e,c===void 0?new am(o,i,t):new om(o,i,t));break}else{let u=e.map[o];u===void 0&&(u=new lm(o),nl(e,u)),e=u}}}class $s{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){const o=t.getActiveUniform(e,a),l=t.getUniformLocation(e,o.name);cm(o,l,this)}const s=[],r=[];for(const a of this.seq)a.type===t.SAMPLER_2D_SHADOW||a.type===t.SAMPLER_CUBE_SHADOW||a.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){const r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){const s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,a=e.length;r!==a;++r){const o=e[r],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,s)}}static seqWithValue(t,e){const n=[];for(let s=0,r=t.length;s!==r;++s){const a=t[s];a.id in e&&n.push(a)}return n}}function il(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const hm=37297;let um=0;function dm(i,t){const e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let a=s;a<r;a++){const o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}const sl=new Ft;function fm(i){$t._getMatrix(sl,$t.workingColorSpace,i);const t=`mat3( ${sl.elements.map(e=>e.toFixed(4))} )`;switch($t.getTransfer(i)){case Qs:return[t,"LinearTransferOETF"];case ee:return[t,"sRGBTransferOETF"];default:return Dt("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function rl(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";const a=/ERROR: 0:(\d+)/.exec(r);if(a){const o=parseInt(a[1]);return e.toUpperCase()+`

`+r+`

`+dm(i.getShaderSource(t),o)}else return r}function pm(i,t){const e=fm(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}const mm={1:"Linear",2:"Reinhard",3:"Cineon",4:"ACESFilmic",6:"AgX",7:"Neutral",5:"Custom"};function gm(i,t){const e=mm[t];return e===void 0?(Dt("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Gs=new D;function _m(){$t.getLuminanceCoefficients(Gs);const i=Gs.x.toFixed(4),t=Gs.y.toFixed(4),e=Gs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function vm(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ji).join(`
`)}function xm(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Mm(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(t,s),a=r.name;let o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),e[a]={type:r.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function ji(i){return i!==""}function al(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function ol(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Sm=/^[ \t]*#include +<([\w\d./]+)>/gm;function ha(i){return i.replace(Sm,bm)}const ym=new Map;function bm(i,t){let e=zt[t];if(e===void 0){const n=ym.get(t);if(n!==void 0)e=zt[n],Dt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">")}return ha(e)}const Tm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ll(i){return i.replace(Tm,Em)}function Em(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function cl(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}const wm={1:"SHADOWMAP_TYPE_PCF",3:"SHADOWMAP_TYPE_VSM"};function Am(i){return wm[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Cm={301:"ENVMAP_TYPE_CUBE",302:"ENVMAP_TYPE_CUBE",306:"ENVMAP_TYPE_CUBE_UV"};function Rm(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Cm[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const Pm={302:"ENVMAP_MODE_REFRACTION"};function Lm(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Pm[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const Dm={0:"ENVMAP_BLENDING_MULTIPLY",1:"ENVMAP_BLENDING_MIX",2:"ENVMAP_BLENDING_ADD"};function Im(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Dm[i.combine]||"ENVMAP_BLENDING_NONE"}function Um(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Nm(i,t,e,n){const s=i.getContext(),r=e.defines;let a=e.vertexShader,o=e.fragmentShader;const l=Am(e),c=Rm(e),h=Lm(e),u=Im(e),d=Um(e),p=vm(e),g=xm(r),_=s.createProgram();let m,f,v=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(ji).join(`
`),m.length>0&&(m+=`
`),f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(ji).join(`
`),f.length>0&&(f+=`
`)):(m=[cl(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ji).join(`
`),f=[cl(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==0?"#define TONE_MAPPING":"",e.toneMapping!==0?zt.tonemapping_pars_fragment:"",e.toneMapping!==0?gm("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",zt.colorspace_pars_fragment,pm("linearToOutputTexel",e.outputColorSpace),_m(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(ji).join(`
`)),a=ha(a),a=al(a,e),a=ol(a,e),o=ha(o),o=al(o,e),o=ol(o,e),a=ll(a),o=ll(o),e.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,f=["#define varying in",e.glslVersion===oo?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===oo?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);const T=v+m+a,S=v+f+o,E=il(s,s.VERTEX_SHADER,T),y=il(s,s.FRAGMENT_SHADER,S);s.attachShader(_,E),s.attachShader(_,y),e.index0AttributeName!==void 0?s.bindAttribLocation(_,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function R(I){if(i.debug.checkShaderErrors){const A=s.getProgramInfoLog(_)||"",U=s.getShaderInfoLog(E)||"",L=s.getShaderInfoLog(y)||"",k=A.trim(),$=U.trim(),H=L.trim();let j=!0,X=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(j=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,E,y);else{const tt=rl(s,E,"vertex"),et=rl(s,y,"fragment");Yt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+k+`
`+tt+`
`+et)}else k!==""?Dt("WebGLProgram: Program Info Log:",k):($===""||H==="")&&(X=!1);X&&(I.diagnostics={runnable:j,programLog:k,vertexShader:{log:$,prefix:m},fragmentShader:{log:H,prefix:f}})}s.deleteShader(E),s.deleteShader(y),x=new $s(s,_),w=Mm(s,_)}let x;this.getUniforms=function(){return x===void 0&&R(this),x};let w;this.getAttributes=function(){return w===void 0&&R(this),w};let C=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=s.getProgramParameter(_,hm)),C},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=um++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=E,this.fragmentShader=y,this}let Fm=0;class Om{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){const s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new km(t),e.set(t,n)),n}}class km{constructor(t){this.id=Fm++,this.code=t,this.usedTimes=0}}function Bm(i){return i===1030||i===37490||i===36285}function zm(i,t,e,n,s,r){const a=new wa,o=new Om,l=new Set,c=[],h=new Map,u=n.logarithmicDepthBuffer;let d=n.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(x){return l.add(x),x===0?"uv":`uv${x}`}function _(x,w,C,I,A,U){const L=I.fog,k=A.geometry,$=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?I.environment:null,H=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,j=t.get(x.envMap||$,H),X=j&&j.mapping===306?j.image.height:null,tt=p[x.type];x.precision!==null&&(d=n.getMaxPrecision(x.precision),d!==x.precision&&Dt("WebGLProgram.getParameters:",x.precision,"not supported, using",d,"instead."));const et=k.morphAttributes.position||k.morphAttributes.normal||k.morphAttributes.color,yt=et!==void 0?et.length:0;let wt=0;k.morphAttributes.position!==void 0&&(wt=1),k.morphAttributes.normal!==void 0&&(wt=2),k.morphAttributes.color!==void 0&&(wt=3);let ne,kt,qt,Y;if(tt){const ce=xn[tt];ne=ce.vertexShader,kt=ce.fragmentShader}else{ne=x.vertexShader,kt=x.fragmentShader;const ce=o.getVertexShaderStage(x),jt=o.getFragmentShaderStage(x);o.update(x,ce,jt),qt=ce.id,Y=jt.id}const it=i.getRenderTarget(),St=i.state.buffers.depth.getReversed(),Nt=A.isInstancedMesh===!0,xt=A.isBatchedMesh===!0,Gt=!!x.map,Te=!!x.matcap,Vt=!!j,Zt=!!x.aoMap,le=!!x.lightMap,Xt=!!x.bumpMap&&x.wireframe===!1,de=!!x.normalMap,Pe=!!x.displacementMap,Xe=!!x.emissiveMap,me=!!x.metalnessMap,Me=!!x.roughnessMap,O=x.anisotropy>0,Fe=x.clearcoat>0,ie=x.dispersion>0,P=x.retroreflectivity>0,M=x.iridescence>0,B=x.sheen>0,V=x.transmission>0,K=O&&!!x.anisotropyMap,rt=Fe&&!!x.clearcoatMap,at=Fe&&!!x.clearcoatNormalMap,J=Fe&&!!x.clearcoatRoughnessMap,Q=M&&!!x.iridescenceMap,ot=M&&!!x.iridescenceThicknessMap,Ct=B&&!!x.sheenColorMap,dt=B&&!!x.sheenRoughnessMap,lt=!!x.specularMap,Rt=!!x.specularColorMap,Lt=!!x.specularIntensityMap,Ot=V&&!!x.transmissionMap,F=V&&!!x.thicknessMap,ct=!!x.gradientMap,Z=!!x.alphaMap,ht=x.alphaTest>0,_t=!!x.alphaHash,st=!!x.extensions;let Pt=0;x.toneMapped&&(it===null||it.isXRRenderTarget===!0)&&(Pt=i.toneMapping);const Et={shaderID:tt,shaderType:x.type,shaderName:x.name,vertexShader:ne,fragmentShader:kt,defines:x.defines,customVertexShaderID:qt,customFragmentShaderID:Y,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:d,batching:xt,batchingColor:xt&&A._colorsTexture!==null,instancing:Nt,instancingColor:Nt&&A.instanceColor!==null,instancingMorph:Nt&&A.morphTexture!==null,outputColorSpace:it===null?i.outputColorSpace:it.isXRRenderTarget===!0?it.texture.colorSpace:$t.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:Gt,matcap:Te,envMap:Vt,envMapMode:Vt&&j.mapping,envMapCubeUVHeight:X,aoMap:Zt,lightMap:le,bumpMap:Xt,normalMap:de,displacementMap:Pe,emissiveMap:Xe,normalMapObjectSpace:de&&x.normalMapType===1,normalMapTangentSpace:de&&x.normalMapType===0,packedNormalMap:de&&x.normalMapType===0&&Bm(x.normalMap.format),metalnessMap:me,roughnessMap:Me,anisotropy:O,anisotropyMap:K,clearcoat:Fe,clearcoatMap:rt,clearcoatNormalMap:at,clearcoatRoughnessMap:J,dispersion:ie,retroreflection:P,iridescence:M,iridescenceMap:Q,iridescenceThicknessMap:ot,sheen:B,sheenColorMap:Ct,sheenRoughnessMap:dt,specularMap:lt,specularColorMap:Rt,specularIntensityMap:Lt,transmission:V,transmissionMap:Ot,thicknessMap:F,gradientMap:ct,opaque:x.transparent===!1&&x.blending===1&&x.alphaToCoverage===!1,alphaMap:Z,alphaTest:ht,alphaHash:_t,combine:x.combine,mapUv:Gt&&g(x.map.channel),aoMapUv:Zt&&g(x.aoMap.channel),lightMapUv:le&&g(x.lightMap.channel),bumpMapUv:Xt&&g(x.bumpMap.channel),normalMapUv:de&&g(x.normalMap.channel),displacementMapUv:Pe&&g(x.displacementMap.channel),emissiveMapUv:Xe&&g(x.emissiveMap.channel),metalnessMapUv:me&&g(x.metalnessMap.channel),roughnessMapUv:Me&&g(x.roughnessMap.channel),anisotropyMapUv:K&&g(x.anisotropyMap.channel),clearcoatMapUv:rt&&g(x.clearcoatMap.channel),clearcoatNormalMapUv:at&&g(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:J&&g(x.clearcoatRoughnessMap.channel),iridescenceMapUv:Q&&g(x.iridescenceMap.channel),iridescenceThicknessMapUv:ot&&g(x.iridescenceThicknessMap.channel),sheenColorMapUv:Ct&&g(x.sheenColorMap.channel),sheenRoughnessMapUv:dt&&g(x.sheenRoughnessMap.channel),specularMapUv:lt&&g(x.specularMap.channel),specularColorMapUv:Rt&&g(x.specularColorMap.channel),specularIntensityMapUv:Lt&&g(x.specularIntensityMap.channel),transmissionMapUv:Ot&&g(x.transmissionMap.channel),thicknessMapUv:F&&g(x.thicknessMap.channel),alphaMapUv:Z&&g(x.alphaMap.channel),vertexTangents:!!k.attributes.tangent&&(de||O),vertexNormals:!!k.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!k.attributes.color&&k.attributes.color.itemSize===4,pointsUvs:A.isPoints===!0&&!!k.attributes.uv&&(Gt||Z),fog:!!L,useFog:x.fog===!0,fogExp2:!!L&&L.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||k.attributes.normal===void 0&&de===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:St,skinning:A.isSkinnedMesh===!0,hasPositionAttribute:k.attributes.position!==void 0,morphTargets:k.morphAttributes.position!==void 0,morphNormals:k.morphAttributes.normal!==void 0,morphColors:k.morphAttributes.color!==void 0,morphTargetsCount:yt,morphTextureStride:wt,numSunLights:w.sun.length,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numSunLightShadows:w.sunShadowMap.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numLightProbeGrids:U.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:Pt,decodeVideoTexture:Gt&&x.map.isVideoTexture===!0&&$t.getTransfer(x.map.colorSpace)===ee,decodeVideoTextureEmissive:Xe&&x.emissiveMap.isVideoTexture===!0&&$t.getTransfer(x.emissiveMap.colorSpace)===ee,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===2,flipSided:x.side===1,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:st&&x.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(st&&x.extensions.multiDraw===!0||xt)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return Et.vertexUv1s=l.has(1),Et.vertexUv2s=l.has(2),Et.vertexUv3s=l.has(3),l.clear(),Et}function m(x){const w=[];if(x.shaderID?w.push(x.shaderID):(w.push(x.customVertexShaderID),w.push(x.customFragmentShaderID)),x.defines!==void 0)for(const C in x.defines)w.push(C),w.push(x.defines[C]);return x.isRawShaderMaterial===!1&&(f(w,x),v(w,x),w.push(i.outputColorSpace)),w.push(x.customProgramCacheKey),w.join()}function f(x,w){x.push(w.precision),x.push(w.outputColorSpace),x.push(w.envMapMode),x.push(w.envMapCubeUVHeight),x.push(w.mapUv),x.push(w.alphaMapUv),x.push(w.lightMapUv),x.push(w.aoMapUv),x.push(w.bumpMapUv),x.push(w.normalMapUv),x.push(w.displacementMapUv),x.push(w.emissiveMapUv),x.push(w.metalnessMapUv),x.push(w.roughnessMapUv),x.push(w.anisotropyMapUv),x.push(w.clearcoatMapUv),x.push(w.clearcoatNormalMapUv),x.push(w.clearcoatRoughnessMapUv),x.push(w.iridescenceMapUv),x.push(w.iridescenceThicknessMapUv),x.push(w.sheenColorMapUv),x.push(w.sheenRoughnessMapUv),x.push(w.specularMapUv),x.push(w.specularColorMapUv),x.push(w.specularIntensityMapUv),x.push(w.transmissionMapUv),x.push(w.thicknessMapUv),x.push(w.combine),x.push(w.fogExp2),x.push(w.sizeAttenuation),x.push(w.morphTargetsCount),x.push(w.morphAttributeCount),x.push(w.numSunLights),x.push(w.numDirLights),x.push(w.numPointLights),x.push(w.numSpotLights),x.push(w.numSpotLightMaps),x.push(w.numHemiLights),x.push(w.numRectAreaLights),x.push(w.numSunLightShadows),x.push(w.numDirLightShadows),x.push(w.numPointLightShadows),x.push(w.numSpotLightShadows),x.push(w.numSpotLightShadowsWithMaps),x.push(w.numLightProbes),x.push(w.shadowMapType),x.push(w.toneMapping),x.push(w.numClippingPlanes),x.push(w.numClipIntersection),x.push(w.depthPacking)}function v(x,w){a.disableAll(),w.instancing&&a.enable(0),w.instancingColor&&a.enable(1),w.instancingMorph&&a.enable(2),w.matcap&&a.enable(3),w.envMap&&a.enable(4),w.normalMapObjectSpace&&a.enable(5),w.normalMapTangentSpace&&a.enable(6),w.clearcoat&&a.enable(7),w.iridescence&&a.enable(8),w.alphaTest&&a.enable(9),w.vertexColors&&a.enable(10),w.vertexAlphas&&a.enable(11),w.vertexUv1s&&a.enable(12),w.vertexUv2s&&a.enable(13),w.vertexUv3s&&a.enable(14),w.vertexTangents&&a.enable(15),w.anisotropy&&a.enable(16),w.alphaHash&&a.enable(17),w.batching&&a.enable(18),w.dispersion&&a.enable(19),w.retroreflection&&a.enable(24),w.batchingColor&&a.enable(20),w.gradientMap&&a.enable(21),w.packedNormalMap&&a.enable(22),w.vertexNormals&&a.enable(23),x.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reversedDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),w.numLightProbeGrids>0&&a.enable(22),w.hasPositionAttribute&&a.enable(23),x.push(a.mask)}function T(x){const w=p[x.type];let C;if(w){const I=xn[w];C=ss.clone(I.uniforms)}else C=x.uniforms;return C}function S(x,w){let C=h.get(w);return C!==void 0?++C.usedTimes:(C=new Nm(i,w,x,s),c.push(C),h.set(w,C)),C}function E(x){if(--x.usedTimes===0){const w=c.indexOf(x);c[w]=c[c.length-1],c.pop(),h.delete(x.cacheKey),x.destroy()}}function y(x){o.remove(x)}function R(){o.dispose()}return{getParameters:_,getProgramCacheKey:m,getUniforms:T,acquireProgram:S,releaseProgram:E,releaseShaderCache:y,programs:c,dispose:R}}function Gm(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,l){i.get(a)[o]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function Hm(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function hl(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function ul(){const i=[];let t=0;const e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function a(d){let p=0;return d.isInstancedMesh&&(p+=2),d.isSkinnedMesh&&(p+=1),p}function o(d,p,g,_,m,f){let v=i[t];return v===void 0?(v={id:d.id,object:d,geometry:p,material:g,materialVariant:a(d),groupOrder:_,renderOrder:d.renderOrder,z:m,group:f},i[t]=v):(v.id=d.id,v.object=d,v.geometry=p,v.material=g,v.materialVariant=a(d),v.groupOrder=_,v.renderOrder=d.renderOrder,v.z=m,v.group=f),t++,v}function l(d,p,g,_,m,f,v){v.reversedDepth===!0&&(m=-m);const T=o(d,p,g,_,m,f);g.transmission>0?n.push(T):g.transparent===!0?s.push(T):e.push(T)}function c(d,p,g,_,m,f){const v=o(d,p,g,_,m,f);g.transmission>0?n.unshift(v):g.transparent===!0?s.unshift(v):e.unshift(v)}function h(d,p){e.length>1&&e.sort(d||Hm),n.length>1&&n.sort(p||hl),s.length>1&&s.sort(p||hl)}function u(){for(let d=t,p=i.length;d<p;d++){const g=i[d];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:u,sort:h}}function Vm(){let i=new WeakMap;function t(n,s){const r=i.get(n);let a;return r===void 0?(a=new ul,i.set(n,[a])):s>=r.length?(a=new ul,r.push(a)):a=r[s],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function Wm(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new D,color:new It};break;case"SpotLight":e={position:new D,direction:new D,color:new It,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new D,color:new It,distance:0,decay:0};break;case"HemisphereLight":e={direction:new D,skyColor:new It,groundColor:new It};break;case"RectAreaLight":e={color:new It,position:new D,halfWidth:new D,halfHeight:new D};break}return i[t.id]=e,e}}}function Xm(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let $m=0;function qm(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Ym(i){const t=new Wm,e=Xm(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new D);const s=new D,r=new se,a=new se;function o(c){let h=0,u=0,d=0;for(let A=0;A<9;A++)n.probe[A].set(0,0,0);let p=0,g=0,_=0,m=0,f=0,v=0,T=0,S=0,E=0,y=0,R=0,x=0,w=0,C=0;c.sort(qm);for(let A=0,U=c.length;A<U;A++){const L=c[A],k=L.color,$=L.intensity,H=L.distance;let j=null;if(L.shadow&&L.shadow.map&&(L.shadow.map.texture.format===1030?j=L.shadow.map.texture:j=L.shadow.map.depthTexture||L.shadow.map.texture),L.isAmbientLight)h+=k.r*$,u+=k.g*$,d+=k.b*$;else if(L.isLightProbe){for(let X=0;X<9;X++)n.probe[X].addScaledVector(L.sh.coefficients[X],$);C++}else if(L.isSunLight){const X=t.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const tt=L.shadow,et=e.get(L);et.shadowIntensity=tt.intensity,et.shadowBias=tt.bias,et.shadowNormalBias=tt.normalBias,et.shadowRadius=tt.radius,et.shadowMapSize.copy(tt.mapSize).multiply(tt.getFrameExtents()),n.sunShadow[g]=et,n.sunShadowMap[g]=j;const yt=tt.getViewportCount();for(let wt=0;wt<yt;wt++)n.sunShadowMatrix[_+wt]=tt.getMatrix(wt),n.sunShadowCascade[_+wt]=tt._cascadeData[wt];_+=yt,g++}n.sun[p]=X,p++}else if(L.isDirectionalLight){const X=t.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const tt=L.shadow,et=e.get(L);et.shadowIntensity=tt.intensity,et.shadowBias=tt.bias,et.shadowNormalBias=tt.normalBias,et.shadowRadius=tt.radius,et.shadowMapSize=tt.mapSize,n.directionalShadow[m]=et,n.directionalShadowMap[m]=j,n.directionalShadowMatrix[m]=L.shadow.matrix,E++}n.directional[m]=X,m++}else if(L.isSpotLight){const X=t.get(L);X.position.setFromMatrixPosition(L.matrixWorld),X.color.copy(k).multiplyScalar($),X.distance=H,X.coneCos=Math.cos(L.angle),X.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),X.decay=L.decay,n.spot[v]=X;const tt=L.shadow;if(L.map&&(n.spotLightMap[x]=L.map,x++,tt.updateMatrices(L),L.castShadow&&w++),n.spotLightMatrix[v]=tt.matrix,L.castShadow){const et=e.get(L);et.shadowIntensity=tt.intensity,et.shadowBias=tt.bias,et.shadowNormalBias=tt.normalBias,et.shadowRadius=tt.radius,et.shadowMapSize=tt.mapSize,n.spotShadow[v]=et,n.spotShadowMap[v]=j,R++}v++}else if(L.isRectAreaLight){const X=t.get(L);X.color.copy(k).multiplyScalar($),X.halfWidth.set(L.width*.5,0,0),X.halfHeight.set(0,L.height*.5,0),n.rectArea[T]=X,T++}else if(L.isPointLight){const X=t.get(L);if(X.color.copy(L.color).multiplyScalar(L.intensity),X.distance=L.distance,X.decay=L.decay,L.castShadow){const tt=L.shadow,et=e.get(L);et.shadowIntensity=tt.intensity,et.shadowBias=tt.bias,et.shadowNormalBias=tt.normalBias,et.shadowRadius=tt.radius,et.shadowMapSize=tt.mapSize,et.shadowCameraNear=tt.camera.near,et.shadowCameraFar=tt.camera.far,n.pointShadow[f]=et,n.pointShadowMap[f]=j,n.pointShadowMatrix[f]=L.shadow.matrix,y++}n.point[f]=X,f++}else if(L.isHemisphereLight){const X=t.get(L);X.skyColor.copy(L.color).multiplyScalar($),X.groundColor.copy(L.groundColor).multiplyScalar($),n.hemi[S]=X,S++}}T>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ft.LTC_FLOAT_1,n.rectAreaLTC2=ft.LTC_FLOAT_2):(n.rectAreaLTC1=ft.LTC_HALF_1,n.rectAreaLTC2=ft.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const I=n.hash;(I.sunLength!==p||I.directionalLength!==m||I.pointLength!==f||I.spotLength!==v||I.rectAreaLength!==T||I.hemiLength!==S||I.numSunShadows!==g||I.numDirectionalShadows!==E||I.numPointShadows!==y||I.numSpotShadows!==R||I.numSpotMaps!==x||I.numLightProbes!==C)&&(n.sun.length=p,n.directional.length=m,n.spot.length=v,n.rectArea.length=T,n.point.length=f,n.hemi.length=S,n.sunShadow.length=g,n.sunShadowMap.length=g,n.sunShadowMatrix.length=_,n.sunShadowCascade.length=_,n.directionalShadow.length=E,n.directionalShadowMap.length=E,n.directionalShadowMatrix.length=E,n.pointShadow.length=y,n.pointShadowMap.length=y,n.pointShadowMatrix.length=y,n.spotShadow.length=R,n.spotShadowMap.length=R,n.spotLightMatrix.length=R+x-w,n.spotLightMap.length=x,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=C,I.sunLength=p,I.directionalLength=m,I.pointLength=f,I.spotLength=v,I.rectAreaLength=T,I.hemiLength=S,I.numSunShadows=g,I.numDirectionalShadows=E,I.numPointShadows=y,I.numSpotShadows=R,I.numSpotMaps=x,I.numLightProbes=C,n.version=$m++)}function l(c,h){let u=0,d=0,p=0,g=0,_=0,m=0;const f=h.matrixWorldInverse;for(let v=0,T=c.length;v<T;v++){const S=c[v];if(S.isSunLight){const E=n.sun[u];E.direction.setFromMatrixPosition(S.matrixWorld),E.direction.transformDirection(f),u++}else if(S.isDirectionalLight){const E=n.directional[d];E.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(f),d++}else if(S.isSpotLight){const E=n.spot[g];E.position.setFromMatrixPosition(S.matrixWorld),E.position.applyMatrix4(f),E.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),E.direction.sub(s),E.direction.transformDirection(f),g++}else if(S.isRectAreaLight){const E=n.rectArea[_];E.position.setFromMatrixPosition(S.matrixWorld),E.position.applyMatrix4(f),a.identity(),r.copy(S.matrixWorld),r.premultiply(f),a.extractRotation(r),E.halfWidth.set(S.width*.5,0,0),E.halfHeight.set(0,S.height*.5,0),E.halfWidth.applyMatrix4(a),E.halfHeight.applyMatrix4(a),_++}else if(S.isPointLight){const E=n.point[p];E.position.setFromMatrixPosition(S.matrixWorld),E.position.applyMatrix4(f),p++}else if(S.isHemisphereLight){const E=n.hemi[m];E.direction.setFromMatrixPosition(S.matrixWorld),E.direction.transformDirection(f),m++}}}return{setup:o,setupView:l,state:n}}function dl(i){const t=new Ym(i),e=[],n=[],s=[];function r(d){u.camera=d,e.length=0,n.length=0,s.length=0}function a(d){e.push(d)}function o(d){n.push(d)}function l(d){s.push(d)}function c(){t.setup(e)}function h(d){t.setupView(e,d)}const u={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:u,setupLights:c,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:l}}function Km(i){let t=new WeakMap;function e(s,r=0){const a=t.get(s);let o;return a===void 0?(o=new dl(i),t.set(s,[o])):r>=a.length?(o=new dl(i),a.push(o)):o=a[r],o}function n(){t=new WeakMap}return{get:e,dispose:n}}const Jm=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Zm=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Qm=[new D(1,0,0),new D(-1,0,0),new D(0,1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1)],jm=[new D(0,-1,0),new D(0,-1,0),new D(0,0,1),new D(0,0,-1),new D(0,-1,0),new D(0,-1,0)],fl=new se,Ji=new D,Jr=new D;function t0(i,t,e){let n=new Ca;const s=new ut,r=new ut,a=new pe,o=new nu,l=new iu,c={},h=e.maxTextureSize,u={0:1,1:0,2:2},d=new Ae({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ut},radius:{value:4}},vertexShader:Jm,fragmentShader:Zm}),p=d.clone();p.defines.HORIZONTAL_PASS=1;const g=new De;g.setAttribute("position",new un(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new pt(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let f=this.type;this.render=function(y,R,x){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||y.length===0)return;this.type===2&&(Dt("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=1);const w=i.getRenderTarget(),C=i.getActiveCubeFace(),I=i.getActiveMipmapLevel(),A=i.state;A.setBlending(0),A.buffers.depth.getReversed()===!0?A.buffers.color.setClear(0,0,0,0):A.buffers.color.setClear(1,1,1,1),A.buffers.depth.setTest(!0),A.setScissorTest(!1);const U=f!==this.type;U&&R.traverse(function(L){L.material&&(Array.isArray(L.material)?L.material.forEach(k=>k.needsUpdate=!0):L.material.needsUpdate=!0)});for(let L=0,k=y.length;L<k;L++){const $=y[L],H=$.shadow;if(H===void 0){Dt("WebGLShadowMap:",$,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;s.copy(H.mapSize);const j=H.getFrameExtents();s.multiply(j),r.copy(H.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/j.x),s.x=r.x*j.x,H.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/j.y),s.y=r.y*j.y,H.mapSize.y=r.y));const X=i.state.buffers.depth.getReversed();if(H.camera._reversedDepth=X,H.map===null||U===!0){if(H.map!==null&&(H.map.depthTexture!==null&&(H.map.depthTexture.dispose(),H.map.depthTexture=null),H.map.dispose()),this.type===3){if($.isPointLight){Dt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}H.map=new We(s.x,s.y,{format:1030,type:1016,minFilter:1006,magFilter:1006,generateMipmaps:!1}),H.map.texture.name=$.name+".shadowMap",H.map.depthTexture=new is(s.x,s.y,1015),H.map.depthTexture.name=$.name+".shadowMapDepth",H.map.depthTexture.format=1026,H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=1003,H.map.depthTexture.magFilter=1003}else $.isPointLight?(H.map=new fc(s.x),H.map.depthTexture=new Fh(s.x,1014)):(H.map=new We(s.x,s.y),H.map.depthTexture=new is(s.x,s.y,1014)),H.map.depthTexture.name=$.name+".shadowMap",H.map.depthTexture.format=1026,this.type===1?(H.map.depthTexture.compareFunction=X?518:515,H.map.depthTexture.minFilter=1006,H.map.depthTexture.magFilter=1006):(H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=1003,H.map.depthTexture.magFilter=1003);H.camera.updateProjectionMatrix()}H.map.isWebGLCubeRenderTarget!==!0&&(H.map.width!==s.x||H.map.height!==s.y)&&H.map.setSize(s.x,s.y);const tt=H.map.isWebGLCubeRenderTarget?6:H.getViewportCount();$.isPointLight!==!0&&H.updateMatrices($,x);for(let et=0;et<tt;et++){const yt=H.getCamera(et);if($.isPointLight){const wt=H.camera,ne=H.matrix,kt=$.distance||wt.far;kt!==wt.far&&(wt.far=kt,wt.updateProjectionMatrix()),Ji.setFromMatrixPosition($.matrixWorld),wt.position.copy(Ji),Jr.copy(wt.position),Jr.add(Qm[et]),wt.up.copy(jm[et]),wt.lookAt(Jr),wt.updateMatrixWorld(),ne.makeTranslation(-Ji.x,-Ji.y,-Ji.z),fl.multiplyMatrices(wt.projectionMatrix,wt.matrixWorldInverse),H._frustum.setFromProjectionMatrix(fl,wt.coordinateSystem,wt.reversedDepth)}if(H.map.isWebGLCubeRenderTarget)i.setRenderTarget(H.map,et),i.clear();else{et===0&&(i.setRenderTarget(H.map),i.clear());const wt=H.getViewport(et);a.set(r.x*wt.x,r.y*wt.y,r.x*wt.z,r.y*wt.w),A.viewport(a)}n=H.getFrustum(et),S(R,x,yt,$,this.type)}H.isPointLightShadow!==!0&&this.type===3&&v(H,x),H.needsUpdate=!1}f=this.type,m.needsUpdate=!1,i.setRenderTarget(w,C,I)};function v(y,R){const x=t.update(_);d.defines.VSM_SAMPLES!==y.blurSamples&&(d.defines.VSM_SAMPLES=y.blurSamples,p.defines.VSM_SAMPLES=y.blurSamples,d.needsUpdate=!0,p.needsUpdate=!0),y.mapPass===null?y.mapPass=new We(s.x,s.y,{format:1030,type:1016}):(y.mapPass.width!==y.map.width||y.mapPass.height!==y.map.height)&&y.mapPass.setSize(y.map.width,y.map.height),d.uniforms.shadow_pass.value=y.map.depthTexture,d.uniforms.resolution.value.set(y.map.width,y.map.height),d.uniforms.radius.value=y.radius,i.setRenderTarget(y.mapPass),i.clear(),i.renderBufferDirect(R,null,x,d,_,null),p.uniforms.shadow_pass.value=y.mapPass.texture,p.uniforms.resolution.value.set(y.map.width,y.map.height),p.uniforms.radius.value=y.radius,i.setRenderTarget(y.map),i.clear(),i.renderBufferDirect(R,null,x,p,_,null)}function T(y,R,x,w){let C=null;const I=x.isPointLight===!0?y.customDistanceMaterial:y.customDepthMaterial;if(I!==void 0)C=I;else if(C=x.isPointLight===!0?l:o,i.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){const A=C.uuid,U=R.uuid;let L=c[A];L===void 0&&(L={},c[A]=L);let k=L[U];k===void 0&&(k=C.clone(),L[U]=k,R.addEventListener("dispose",E)),C=k}if(C.visible=R.visible,C.wireframe=R.wireframe,w===3?C.side=R.shadowSide!==null?R.shadowSide:R.side:C.side=R.shadowSide!==null?R.shadowSide:u[R.side],C.alphaMap=R.alphaMap,C.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,C.map=R.map,C.clipShadows=R.clipShadows,C.clippingPlanes=R.clippingPlanes,C.clipIntersection=R.clipIntersection,C.displacementMap=R.displacementMap,C.displacementScale=R.displacementScale,C.displacementBias=R.displacementBias,C.wireframeLinewidth=R.wireframeLinewidth,C.linewidth=R.linewidth,x.isPointLight===!0&&C.isMeshDistanceMaterial===!0){const A=i.properties.get(C);A.light=x}return C}function S(y,R,x,w,C){if(y.visible===!1)return;if(y.layers.test(R.layers)&&(y.isMesh||y.isLine||y.isPoints)&&(y.castShadow||y.receiveShadow&&C===3)&&(!y.frustumCulled||y.intersectsFrustum(n))){y.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,y.matrixWorld);const U=t.update(y),L=y.material;if(Array.isArray(L)){const k=U.groups;for(let $=0,H=k.length;$<H;$++){const j=k[$],X=L[j.materialIndex];if(X&&X.visible){const tt=T(y,X,w,C);y.onBeforeShadow(i,y,R,x,U,tt,j),i.renderBufferDirect(x,null,U,tt,y,j),y.onAfterShadow(i,y,R,x,U,tt,j)}}}else if(L.visible){const k=T(y,L,w,C);y.onBeforeShadow(i,y,R,x,U,k,null),i.renderBufferDirect(x,null,U,k,y,null),y.onAfterShadow(i,y,R,x,U,k,null)}}const A=y.children;for(let U=0,L=A.length;U<L;U++)S(A[U],R,x,w,C)}function E(y){y.target.removeEventListener("dispose",E);for(const x in c){const w=c[x],C=y.target.uuid;C in w&&(w[C].dispose(),delete w[C])}}}function e0(i,t){function e(){let F=!1;const ct=new pe;let Z=null;const ht=new pe(0,0,0,0);return{setMask:function(_t){Z!==_t&&!F&&(i.colorMask(_t,_t,_t,_t),Z=_t)},setLocked:function(_t){F=_t},setClear:function(_t,st,Pt,Et,ce){ce===!0&&(_t*=Et,st*=Et,Pt*=Et),ct.set(_t,st,Pt,Et),ht.equals(ct)===!1&&(i.clearColor(_t,st,Pt,Et),ht.copy(ct))},reset:function(){F=!1,Z=null,ht.set(-1,0,0,0)}}}function n(){let F=!1,ct=!1,Z=null,ht=null,_t=null;return{setReversed:function(st){if(ct!==st){const Pt=t.get("EXT_clip_control");st?Pt.clipControlEXT(Pt.LOWER_LEFT_EXT,Pt.ZERO_TO_ONE_EXT):Pt.clipControlEXT(Pt.LOWER_LEFT_EXT,Pt.NEGATIVE_ONE_TO_ONE_EXT),ct=st;const Et=_t;_t=null,this.setClear(Et)}},getReversed:function(){return ct},setTest:function(st){st?it(i.DEPTH_TEST):St(i.DEPTH_TEST)},setMask:function(st){Z!==st&&!F&&(i.depthMask(st),Z=st)},setFunc:function(st){if(ct&&(st=ah[st]),ht!==st){switch(st){case 0:i.depthFunc(i.NEVER);break;case 1:i.depthFunc(i.ALWAYS);break;case 2:i.depthFunc(i.LESS);break;case 3:i.depthFunc(i.LEQUAL);break;case 4:i.depthFunc(i.EQUAL);break;case 5:i.depthFunc(i.GEQUAL);break;case 6:i.depthFunc(i.GREATER);break;case 7:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ht=st}},setLocked:function(st){F=st},setClear:function(st){_t!==st&&(_t=st,ct&&(st=1-st),i.clearDepth(st))},reset:function(){F=!1,Z=null,ht=null,_t=null,ct=!1}}}function s(){let F=!1,ct=null,Z=null,ht=null,_t=null,st=null,Pt=null,Et=null,ce=null;return{setTest:function(jt){F||(jt?it(i.STENCIL_TEST):St(i.STENCIL_TEST))},setMask:function(jt){ct!==jt&&!F&&(i.stencilMask(jt),ct=jt)},setFunc:function(jt,an,dn){(Z!==jt||ht!==an||_t!==dn)&&(i.stencilFunc(jt,an,dn),Z=jt,ht=an,_t=dn)},setOp:function(jt,an,dn){(st!==jt||Pt!==an||Et!==dn)&&(i.stencilOp(jt,an,dn),st=jt,Pt=an,Et=dn)},setLocked:function(jt){F=jt},setClear:function(jt){ce!==jt&&(i.clearStencil(jt),ce=jt)},reset:function(){F=!1,ct=null,Z=null,ht=null,_t=null,st=null,Pt=null,Et=null,ce=null}}}const r=new e,a=new n,o=new s,l=new WeakMap,c=new WeakMap;let h={},u={},d={},p=new WeakMap,g=[],_=null,m=!1,f=null,v=null,T=null,S=null,E=null,y=null,R=null,x=new It(0,0,0),w=0,C=!1,I=null,A=null,U=null,L=null,k=null;const $=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let H=!1,j=0;const X=i.getParameter(i.VERSION);X.indexOf("WebGL")!==-1?(j=parseFloat(/^WebGL (\d)/.exec(X)[1]),H=j>=1):X.indexOf("OpenGL ES")!==-1&&(j=parseFloat(/^OpenGL ES (\d)/.exec(X)[1]),H=j>=2);let tt=null,et={};const yt=i.getParameter(i.SCISSOR_BOX),wt=i.getParameter(i.VIEWPORT),ne=new pe().fromArray(yt),kt=new pe().fromArray(wt);function qt(F,ct,Z,ht){const _t=new Uint8Array(4),st=i.createTexture();i.bindTexture(F,st),i.texParameteri(F,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(F,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Pt=0;Pt<Z;Pt++)F===i.TEXTURE_3D||F===i.TEXTURE_2D_ARRAY?i.texImage3D(ct,0,i.RGBA,1,1,ht,0,i.RGBA,i.UNSIGNED_BYTE,_t):i.texImage2D(ct+Pt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,_t);return st}const Y={};Y[i.TEXTURE_2D]=qt(i.TEXTURE_2D,i.TEXTURE_2D,1),Y[i.TEXTURE_CUBE_MAP]=qt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Y[i.TEXTURE_2D_ARRAY]=qt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Y[i.TEXTURE_3D]=qt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),it(i.DEPTH_TEST),a.setFunc(3),Xt(!1),de(1),it(i.CULL_FACE),Zt(0);function it(F){h[F]!==!0&&(i.enable(F),h[F]=!0)}function St(F){h[F]!==!1&&(i.disable(F),h[F]=!1)}function Nt(F,ct){return d[F]!==ct?(i.bindFramebuffer(F,ct),d[F]=ct,F===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=ct),F===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=ct),!0):!1}function xt(F,ct){let Z=g,ht=!1;if(F){Z=p.get(ct),Z===void 0&&(Z=[],p.set(ct,Z));const _t=F.textures;if(Z.length!==_t.length||Z[0]!==i.COLOR_ATTACHMENT0){for(let st=0,Pt=_t.length;st<Pt;st++)Z[st]=i.COLOR_ATTACHMENT0+st;Z.length=_t.length,ht=!0}}else Z[0]!==i.BACK&&(Z[0]=i.BACK,ht=!0);ht&&i.drawBuffers(Z)}function Gt(F){return _!==F?(i.useProgram(F),_=F,!0):!1}const Te={100:i.FUNC_ADD,101:i.FUNC_SUBTRACT,102:i.FUNC_REVERSE_SUBTRACT};Te[103]=i.MIN,Te[104]=i.MAX;const Vt={200:i.ZERO,201:i.ONE,202:i.SRC_COLOR,204:i.SRC_ALPHA,210:i.SRC_ALPHA_SATURATE,208:i.DST_COLOR,206:i.DST_ALPHA,203:i.ONE_MINUS_SRC_COLOR,205:i.ONE_MINUS_SRC_ALPHA,209:i.ONE_MINUS_DST_COLOR,207:i.ONE_MINUS_DST_ALPHA,211:i.CONSTANT_COLOR,212:i.ONE_MINUS_CONSTANT_COLOR,213:i.CONSTANT_ALPHA,214:i.ONE_MINUS_CONSTANT_ALPHA};function Zt(F,ct,Z,ht,_t,st,Pt,Et,ce,jt){if(F===0){m===!0&&(St(i.BLEND),m=!1);return}if(m===!1&&(it(i.BLEND),m=!0),F!==5){if(F!==f||jt!==C){if((v!==100||E!==100)&&(i.blendEquation(i.FUNC_ADD),v=100,E=100),jt)switch(F){case 1:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case 2:i.blendFunc(i.ONE,i.ONE);break;case 3:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case 4:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Yt("WebGLState: Invalid blending: ",F);break}else switch(F){case 1:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case 2:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case 3:Yt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case 4:Yt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Yt("WebGLState: Invalid blending: ",F);break}T=null,S=null,y=null,R=null,x.set(0,0,0),w=0,f=F,C=jt}return}_t=_t||ct,st=st||Z,Pt=Pt||ht,(ct!==v||_t!==E)&&(i.blendEquationSeparate(Te[ct],Te[_t]),v=ct,E=_t),(Z!==T||ht!==S||st!==y||Pt!==R)&&(i.blendFuncSeparate(Vt[Z],Vt[ht],Vt[st],Vt[Pt]),T=Z,S=ht,y=st,R=Pt),(Et.equals(x)===!1||ce!==w)&&(i.blendColor(Et.r,Et.g,Et.b,ce),x.copy(Et),w=ce),f=F,C=!1}function le(F,ct){F.side===2?St(i.CULL_FACE):it(i.CULL_FACE);let Z=F.side===1;ct&&(Z=!Z),Xt(Z),F.blending===1&&F.transparent===!1?Zt(0):Zt(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),a.setFunc(F.depthFunc),a.setTest(F.depthTest),a.setMask(F.depthWrite),r.setMask(F.colorWrite);const ht=F.stencilWrite;o.setTest(ht),ht&&(o.setMask(F.stencilWriteMask),o.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),o.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),Xe(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?it(i.SAMPLE_ALPHA_TO_COVERAGE):St(i.SAMPLE_ALPHA_TO_COVERAGE)}function Xt(F){I!==F&&(F?i.frontFace(i.CW):i.frontFace(i.CCW),I=F)}function de(F){F!==0?(it(i.CULL_FACE),F!==A&&(F===1?i.cullFace(i.BACK):F===2?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):St(i.CULL_FACE),A=F}function Pe(F){F!==U&&(H&&i.lineWidth(F),U=F)}function Xe(F,ct,Z){F?(it(i.POLYGON_OFFSET_FILL),(L!==ct||k!==Z)&&(L=ct,k=Z,a.getReversed()&&(ct=-ct),i.polygonOffset(ct,Z))):St(i.POLYGON_OFFSET_FILL)}function me(F){F?it(i.SCISSOR_TEST):St(i.SCISSOR_TEST)}function Me(F){F===void 0&&(F=i.TEXTURE0+$-1),tt!==F&&(i.activeTexture(F),tt=F)}function O(F,ct,Z){Z===void 0&&(tt===null?Z=i.TEXTURE0+$-1:Z=tt);let ht=et[Z];ht===void 0&&(ht={type:void 0,texture:void 0},et[Z]=ht),(ht.type!==F||ht.texture!==ct)&&(tt!==Z&&(i.activeTexture(Z),tt=Z),i.bindTexture(F,ct||Y[F]),ht.type=F,ht.texture=ct)}function Fe(){const F=et[tt];F!==void 0&&F.type!==void 0&&(i.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function ie(){try{i.compressedTexImage2D(...arguments)}catch(F){Yt("WebGLState:",F)}}function P(){try{i.compressedTexImage3D(...arguments)}catch(F){Yt("WebGLState:",F)}}function M(){try{i.texSubImage2D(...arguments)}catch(F){Yt("WebGLState:",F)}}function B(){try{i.texSubImage3D(...arguments)}catch(F){Yt("WebGLState:",F)}}function V(){try{i.compressedTexSubImage2D(...arguments)}catch(F){Yt("WebGLState:",F)}}function K(){try{i.compressedTexSubImage3D(...arguments)}catch(F){Yt("WebGLState:",F)}}function rt(){try{i.texStorage2D(...arguments)}catch(F){Yt("WebGLState:",F)}}function at(){try{i.texStorage3D(...arguments)}catch(F){Yt("WebGLState:",F)}}function J(){try{i.texImage2D(...arguments)}catch(F){Yt("WebGLState:",F)}}function Q(){try{i.texImage3D(...arguments)}catch(F){Yt("WebGLState:",F)}}function ot(F){return u[F]!==void 0?u[F]:i.getParameter(F)}function Ct(F,ct){u[F]!==ct&&(i.pixelStorei(F,ct),u[F]=ct)}function dt(F){ne.equals(F)===!1&&(i.scissor(F.x,F.y,F.z,F.w),ne.copy(F))}function lt(F){kt.equals(F)===!1&&(i.viewport(F.x,F.y,F.z,F.w),kt.copy(F))}function Rt(F,ct){let Z=c.get(ct);Z===void 0&&(Z=new WeakMap,c.set(ct,Z));let ht=Z.get(F);ht===void 0&&(ht=i.getUniformBlockIndex(ct,F.name),Z.set(F,ht))}function Lt(F,ct){const ht=c.get(ct).get(F);l.get(ct)!==ht&&(i.uniformBlockBinding(ct,ht,F.__bindingPointIndex),l.set(ct,ht))}function Ot(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},u={},tt=null,et={},d={},p=new WeakMap,g=[],_=null,m=!1,f=null,v=null,T=null,S=null,E=null,y=null,R=null,x=new It(0,0,0),w=0,C=!1,I=null,A=null,U=null,L=null,k=null,ne.set(0,0,i.canvas.width,i.canvas.height),kt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:it,disable:St,bindFramebuffer:Nt,drawBuffers:xt,useProgram:Gt,setBlending:Zt,setMaterial:le,setFlipSided:Xt,setCullFace:de,setLineWidth:Pe,setPolygonOffset:Xe,setScissorTest:me,activeTexture:Me,bindTexture:O,unbindTexture:Fe,compressedTexImage2D:ie,compressedTexImage3D:P,texImage2D:J,texImage3D:Q,pixelStorei:Ct,getParameter:ot,updateUBOMapping:Rt,uniformBlockBinding:Lt,texStorage2D:rt,texStorage3D:at,texSubImage2D:M,texSubImage3D:B,compressedTexSubImage2D:V,compressedTexSubImage3D:K,scissor:dt,viewport:lt,reset:Ot}}function n0(i,t,e,n,s,r,a){const o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ut,h=new WeakMap,u=new Set;let d;const p=new WeakMap;let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(P,M){return g?new OffscreenCanvas(P,M):ns("canvas")}function m(P,M,B){let V=1;const K=ie(P);if((K.width>B||K.height>B)&&(V=B/Math.max(K.width,K.height)),V<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const rt=Math.floor(V*K.width),at=Math.floor(V*K.height);d===void 0&&(d=_(rt,at));const J=M?_(rt,at):d;return J.width=rt,J.height=at,J.getContext("2d").drawImage(P,0,0,rt,at),Dt("WebGLRenderer: Texture has been resized from ("+K.width+"x"+K.height+") to ("+rt+"x"+at+")."),J}else return"data"in P&&Dt("WebGLRenderer: Image in DataTexture is too big ("+K.width+"x"+K.height+")."),P;return P}function f(P){return P.generateMipmaps}function v(P){i.generateMipmap(P)}function T(P){return P.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?i.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function S(P,M,B,V,K,rt=!1){if(P!==null){if(i[P]!==void 0)return i[P];Dt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let at;V&&(at=t.get("EXT_texture_norm16"),at||Dt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let J=M;if(M===i.RED&&(B===i.FLOAT&&(J=i.R32F),B===i.HALF_FLOAT&&(J=i.R16F),B===i.UNSIGNED_BYTE&&(J=i.R8),B===i.UNSIGNED_SHORT&&at&&(J=at.R16_EXT),B===i.SHORT&&at&&(J=at.R16_SNORM_EXT)),M===i.RED_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.R8UI),B===i.UNSIGNED_SHORT&&(J=i.R16UI),B===i.UNSIGNED_INT&&(J=i.R32UI),B===i.BYTE&&(J=i.R8I),B===i.SHORT&&(J=i.R16I),B===i.INT&&(J=i.R32I)),M===i.RG&&(B===i.FLOAT&&(J=i.RG32F),B===i.HALF_FLOAT&&(J=i.RG16F),B===i.UNSIGNED_BYTE&&(J=i.RG8),B===i.UNSIGNED_SHORT&&at&&(J=at.RG16_EXT),B===i.SHORT&&at&&(J=at.RG16_SNORM_EXT)),M===i.RG_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RG8UI),B===i.UNSIGNED_SHORT&&(J=i.RG16UI),B===i.UNSIGNED_INT&&(J=i.RG32UI),B===i.BYTE&&(J=i.RG8I),B===i.SHORT&&(J=i.RG16I),B===i.INT&&(J=i.RG32I)),M===i.RGB_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RGB8UI),B===i.UNSIGNED_SHORT&&(J=i.RGB16UI),B===i.UNSIGNED_INT&&(J=i.RGB32UI),B===i.BYTE&&(J=i.RGB8I),B===i.SHORT&&(J=i.RGB16I),B===i.INT&&(J=i.RGB32I)),M===i.RGBA_INTEGER&&(B===i.UNSIGNED_BYTE&&(J=i.RGBA8UI),B===i.UNSIGNED_SHORT&&(J=i.RGBA16UI),B===i.UNSIGNED_INT&&(J=i.RGBA32UI),B===i.BYTE&&(J=i.RGBA8I),B===i.SHORT&&(J=i.RGBA16I),B===i.INT&&(J=i.RGBA32I)),M===i.RGB&&(B===i.UNSIGNED_SHORT&&at&&(J=at.RGB16_EXT),B===i.SHORT&&at&&(J=at.RGB16_SNORM_EXT),B===i.UNSIGNED_INT_5_9_9_9_REV&&(J=i.RGB9_E5),B===i.UNSIGNED_INT_10F_11F_11F_REV&&(J=i.R11F_G11F_B10F)),M===i.RGBA){const Q=rt?Qs:$t.getTransfer(K);B===i.FLOAT&&(J=i.RGBA32F),B===i.HALF_FLOAT&&(J=i.RGBA16F),B===i.UNSIGNED_BYTE&&(J=Q===ee?i.SRGB8_ALPHA8:i.RGBA8),B===i.UNSIGNED_SHORT&&at&&(J=at.RGBA16_EXT),B===i.SHORT&&at&&(J=at.RGBA16_SNORM_EXT),B===i.UNSIGNED_SHORT_4_4_4_4&&(J=i.RGBA4),B===i.UNSIGNED_SHORT_5_5_5_1&&(J=i.RGB5_A1)}return(J===i.R16F||J===i.R32F||J===i.RG16F||J===i.RG32F||J===i.RGBA16F||J===i.RGBA32F)&&t.get("EXT_color_buffer_float"),J}function E(P,M){let B;return P?M===null||M===1014||M===1020?B=i.DEPTH24_STENCIL8:M===1015?B=i.DEPTH32F_STENCIL8:M===1012&&(B=i.DEPTH24_STENCIL8,Dt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===1014||M===1020?B=i.DEPTH_COMPONENT24:M===1015?B=i.DEPTH_COMPONENT32F:M===1012&&(B=i.DEPTH_COMPONENT16),B}function y(P,M){return f(P)===!0||P.isFramebufferTexture&&P.minFilter!==1003&&P.minFilter!==1006?Math.log2(Math.max(M.width,M.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?M.mipmaps.length:1}function R(P){const M=P.target;M.removeEventListener("dispose",R),w(M),M.isVideoTexture&&h.delete(M),M.isHTMLTexture&&u.delete(M)}function x(P){const M=P.target;M.removeEventListener("dispose",x),I(M)}function w(P){const M=n.get(P);if(M.__webglInit===void 0)return;const B=P.source,V=p.get(B);if(V){const K=V[M.__cacheKey];K.usedTimes--,K.usedTimes===0&&C(P),Object.keys(V).length===0&&p.delete(B)}n.remove(P)}function C(P){const M=n.get(P);i.deleteTexture(M.__webglTexture);const B=P.source,V=p.get(B);delete V[M.__cacheKey],a.memory.textures--}function I(P){const M=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let V=0;V<6;V++){if(Array.isArray(M.__webglFramebuffer[V]))for(let K=0;K<M.__webglFramebuffer[V].length;K++)i.deleteFramebuffer(M.__webglFramebuffer[V][K]);else i.deleteFramebuffer(M.__webglFramebuffer[V]);M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer[V])}else{if(Array.isArray(M.__webglFramebuffer))for(let V=0;V<M.__webglFramebuffer.length;V++)i.deleteFramebuffer(M.__webglFramebuffer[V]);else i.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&i.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let V=0;V<M.__webglColorRenderbuffer.length;V++)M.__webglColorRenderbuffer[V]&&i.deleteRenderbuffer(M.__webglColorRenderbuffer[V]);M.__webglDepthRenderbuffer&&i.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const B=P.textures;for(let V=0,K=B.length;V<K;V++){const rt=n.get(B[V]);rt.__webglTexture&&(i.deleteTexture(rt.__webglTexture),a.memory.textures--),n.remove(B[V])}n.remove(P)}let A=0;function U(){A=0}function L(){return A}function k(P){A=P}function $(){const P=A;return P>=s.maxTextures&&Dt("WebGLTextures: Trying to use "+(P+1)+" texture units while this GPU supports only "+s.maxTextures),A+=1,P}function H(P){const M=[];return M.push(P.wrapS),M.push(P.wrapT),M.push(P.wrapR||0),M.push(P.magFilter),M.push(P.minFilter),M.push(P.anisotropy),M.push(P.internalFormat),M.push(P.format),M.push(P.type),M.push(P.generateMipmaps),M.push(P.premultiplyAlpha),M.push(P.flipY),M.push(P.unpackAlignment),M.push(P.colorSpace),M.join()}function j(P,M){const B=n.get(P);if(P.isVideoTexture&&O(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&B.__version!==P.version){const V=P.image;if(V===null)Dt("WebGLRenderer: Texture marked for update but no image data found.");else if(V.complete===!1)Dt("WebGLRenderer: Texture marked for update but image is incomplete");else{St(B,P,M);return}}else P.isExternalTexture&&(B.__webglTexture=P.sourceTexture?P.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,B.__webglTexture,i.TEXTURE0+M)}function X(P,M){const B=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&B.__version!==P.version){St(B,P,M);return}else P.isExternalTexture&&(B.__webglTexture=P.sourceTexture?P.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,B.__webglTexture,i.TEXTURE0+M)}function tt(P,M){const B=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&B.__version!==P.version){St(B,P,M);return}e.bindTexture(i.TEXTURE_3D,B.__webglTexture,i.TEXTURE0+M)}function et(P,M){const B=n.get(P);if(P.isCubeDepthTexture!==!0&&P.version>0&&B.__version!==P.version){Nt(B,P,M);return}e.bindTexture(i.TEXTURE_CUBE_MAP,B.__webglTexture,i.TEXTURE0+M)}const yt={1e3:i.REPEAT,1001:i.CLAMP_TO_EDGE,1002:i.MIRRORED_REPEAT},wt={1003:i.NEAREST,1004:i.NEAREST_MIPMAP_NEAREST,1005:i.NEAREST_MIPMAP_LINEAR,1006:i.LINEAR,1007:i.LINEAR_MIPMAP_NEAREST,1008:i.LINEAR_MIPMAP_LINEAR},ne={512:i.NEVER,519:i.ALWAYS,513:i.LESS,515:i.LEQUAL,514:i.EQUAL,518:i.GEQUAL,516:i.GREATER,517:i.NOTEQUAL};function kt(P,M){if(M.type===1015&&t.has("OES_texture_float_linear")===!1&&(M.magFilter===1006||M.magFilter===1007||M.magFilter===1005||M.magFilter===1008||M.minFilter===1006||M.minFilter===1007||M.minFilter===1005||M.minFilter===1008)&&Dt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(P,i.TEXTURE_WRAP_S,yt[M.wrapS]),i.texParameteri(P,i.TEXTURE_WRAP_T,yt[M.wrapT]),(P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY)&&i.texParameteri(P,i.TEXTURE_WRAP_R,yt[M.wrapR]),i.texParameteri(P,i.TEXTURE_MAG_FILTER,wt[M.magFilter]),i.texParameteri(P,i.TEXTURE_MIN_FILTER,wt[M.minFilter]),M.compareFunction&&(i.texParameteri(P,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(P,i.TEXTURE_COMPARE_FUNC,ne[M.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===1003||M.minFilter!==1005&&M.minFilter!==1008||M.type===1015&&t.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){const B=t.get("EXT_texture_filter_anisotropic");i.texParameterf(P,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,s.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function qt(P,M){let B=!1;P.__webglInit===void 0&&(P.__webglInit=!0,M.addEventListener("dispose",R));const V=M.source;let K=p.get(V);K===void 0&&(K={},p.set(V,K));const rt=H(M);if(rt!==P.__cacheKey){K[rt]===void 0&&(K[rt]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,B=!0),K[rt].usedTimes++;const at=K[P.__cacheKey];at!==void 0&&(K[P.__cacheKey].usedTimes--,at.usedTimes===0&&C(M)),P.__cacheKey=rt,P.__webglTexture=K[rt].texture}return B}function Y(P,M,B){return Math.floor(Math.floor(P/B)/M)}function it(P,M,B,V){const rt=P.updateRanges;if(rt.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,M.width,M.height,B,V,M.data);else{rt.sort((Ct,dt)=>Ct.start-dt.start);let at=0;for(let Ct=1;Ct<rt.length;Ct++){const dt=rt[at],lt=rt[Ct],Rt=dt.start+dt.count,Lt=Y(lt.start,M.width,4),Ot=Y(dt.start,M.width,4);lt.start<=Rt+1&&Lt===Ot&&Y(lt.start+lt.count-1,M.width,4)===Lt?dt.count=Math.max(dt.count,lt.start+lt.count-dt.start):(++at,rt[at]=lt)}rt.length=at+1;const J=e.getParameter(i.UNPACK_ROW_LENGTH),Q=e.getParameter(i.UNPACK_SKIP_PIXELS),ot=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,M.width);for(let Ct=0,dt=rt.length;Ct<dt;Ct++){const lt=rt[Ct],Rt=Math.floor(lt.start/4),Lt=Math.ceil(lt.count/4),Ot=Rt%M.width,F=Math.floor(Rt/M.width),ct=Lt,Z=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,Ot),e.pixelStorei(i.UNPACK_SKIP_ROWS,F),e.texSubImage2D(i.TEXTURE_2D,0,Ot,F,ct,Z,B,V,M.data)}P.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,J),e.pixelStorei(i.UNPACK_SKIP_PIXELS,Q),e.pixelStorei(i.UNPACK_SKIP_ROWS,ot)}}function St(P,M,B){let V=i.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(V=i.TEXTURE_2D_ARRAY),M.isData3DTexture&&(V=i.TEXTURE_3D);const K=qt(P,M),rt=M.source;e.bindTexture(V,P.__webglTexture,i.TEXTURE0+B);const at=n.get(rt);if(rt.version!==at.__version||K===!0){if(e.activeTexture(i.TEXTURE0+B),(typeof ImageBitmap<"u"&&M.image instanceof ImageBitmap)===!1){const Z=$t.getPrimaries($t.workingColorSpace),ht=M.colorSpace===""?null:$t.getPrimaries(M.colorSpace),_t=M.colorSpace===""||Z===ht?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,_t)}e.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment);let Q=m(M.image,!1,s.maxTextureSize);Q=Fe(M,Q);const ot=r.convert(M.format,M.colorSpace),Ct=r.convert(M.type);let dt=S(M.internalFormat,ot,Ct,M.normalized,M.colorSpace,M.isVideoTexture);kt(V,M);let lt;const Rt=M.mipmaps,Lt=M.isVideoTexture!==!0,Ot=at.__version===void 0||K===!0,F=rt.dataReady,ct=y(M,Q);if(M.isDepthTexture)dt=E(M.format===1027,M.type),Ot&&(Lt?e.texStorage2D(i.TEXTURE_2D,1,dt,Q.width,Q.height):e.texImage2D(i.TEXTURE_2D,0,dt,Q.width,Q.height,0,ot,Ct,null));else if(M.isDataTexture)if(Rt.length>0){Lt&&Ot&&e.texStorage2D(i.TEXTURE_2D,ct,dt,Rt[0].width,Rt[0].height);for(let Z=0,ht=Rt.length;Z<ht;Z++)lt=Rt[Z],Lt?F&&e.texSubImage2D(i.TEXTURE_2D,Z,0,0,lt.width,lt.height,ot,Ct,lt.data):e.texImage2D(i.TEXTURE_2D,Z,dt,lt.width,lt.height,0,ot,Ct,lt.data);M.generateMipmaps=!1}else Lt?(Ot&&e.texStorage2D(i.TEXTURE_2D,ct,dt,Q.width,Q.height),F&&it(M,Q,ot,Ct)):e.texImage2D(i.TEXTURE_2D,0,dt,Q.width,Q.height,0,ot,Ct,Q.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){Lt&&Ot&&e.texStorage3D(i.TEXTURE_2D_ARRAY,ct,dt,Rt[0].width,Rt[0].height,Q.depth);for(let Z=0,ht=Rt.length;Z<ht;Z++)if(lt=Rt[Z],M.format!==1023)if(ot!==null)if(Lt){if(F)if(M.layerUpdates.size>0){const _t=Xo(lt.width,lt.height,M.format,M.type);for(const st of M.layerUpdates){const Pt=lt.data.subarray(st*_t/lt.data.BYTES_PER_ELEMENT,(st+1)*_t/lt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,st,lt.width,lt.height,1,ot,Pt)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,0,lt.width,lt.height,Q.depth,ot,lt.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,Z,dt,lt.width,lt.height,Q.depth,0,lt.data,0,0);else Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Lt?F&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,0,lt.width,lt.height,Q.depth,ot,Ct,lt.data):e.texImage3D(i.TEXTURE_2D_ARRAY,Z,dt,lt.width,lt.height,Q.depth,0,ot,Ct,lt.data);M.layerUpdates.size>0&&M.clearLayerUpdates()}else{Lt&&Ot&&e.texStorage2D(i.TEXTURE_2D,ct,dt,Rt[0].width,Rt[0].height);for(let Z=0,ht=Rt.length;Z<ht;Z++)lt=Rt[Z],M.format!==1023?ot!==null?Lt?F&&e.compressedTexSubImage2D(i.TEXTURE_2D,Z,0,0,lt.width,lt.height,ot,lt.data):e.compressedTexImage2D(i.TEXTURE_2D,Z,dt,lt.width,lt.height,0,lt.data):Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Lt?F&&e.texSubImage2D(i.TEXTURE_2D,Z,0,0,lt.width,lt.height,ot,Ct,lt.data):e.texImage2D(i.TEXTURE_2D,Z,dt,lt.width,lt.height,0,ot,Ct,lt.data)}else if(M.isDataArrayTexture)if(Lt){if(Ot&&e.texStorage3D(i.TEXTURE_2D_ARRAY,ct,dt,Q.width,Q.height,Q.depth),F)if(M.layerUpdates.size>0){const Z=Xo(Q.width,Q.height,M.format,M.type);for(const ht of M.layerUpdates){const _t=Q.data.subarray(ht*Z/Q.data.BYTES_PER_ELEMENT,(ht+1)*Z/Q.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ht,Q.width,Q.height,1,ot,Ct,_t)}M.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,Q.width,Q.height,Q.depth,ot,Ct,Q.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,dt,Q.width,Q.height,Q.depth,0,ot,Ct,Q.data);else if(M.isData3DTexture)Lt?(Ot&&e.texStorage3D(i.TEXTURE_3D,ct,dt,Q.width,Q.height,Q.depth),F&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,Q.width,Q.height,Q.depth,ot,Ct,Q.data)):e.texImage3D(i.TEXTURE_3D,0,dt,Q.width,Q.height,Q.depth,0,ot,Ct,Q.data);else if(M.isFramebufferTexture){if(Ot)if(Lt)e.texStorage2D(i.TEXTURE_2D,ct,dt,Q.width,Q.height);else{let Z=Q.width,ht=Q.height;for(let _t=0;_t<ct;_t++)e.texImage2D(i.TEXTURE_2D,_t,dt,Z,ht,0,ot,Ct,null),Z>>=1,ht>>=1}}else if(M.isHTMLTexture){if("texElementImage2D"in i){const Z=i.canvas;if(Z.hasAttribute("layoutsubtree")||Z.setAttribute("layoutsubtree","true"),Q.parentNode!==Z){Z.appendChild(Q),u.add(M),Z.onpaint=ht=>{const _t=ht.changedElements;for(const st of u)_t.includes(st.image)&&(st.needsUpdate=!0)},Z.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,Q);else{const _t=i.RGBA,st=i.RGBA,Pt=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,_t,st,Pt,Q)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Rt.length>0){if(Lt&&Ot){const Z=ie(Rt[0]);e.texStorage2D(i.TEXTURE_2D,ct,dt,Z.width,Z.height)}for(let Z=0,ht=Rt.length;Z<ht;Z++)lt=Rt[Z],Lt?F&&e.texSubImage2D(i.TEXTURE_2D,Z,0,0,ot,Ct,lt):e.texImage2D(i.TEXTURE_2D,Z,dt,ot,Ct,lt);M.generateMipmaps=!1}else if(Lt){if(Ot){const Z=ie(Q);e.texStorage2D(i.TEXTURE_2D,ct,dt,Z.width,Z.height)}F&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,ot,Ct,Q)}else e.texImage2D(i.TEXTURE_2D,0,dt,ot,Ct,Q);f(M)&&v(V),at.__version=rt.version,M.onUpdate&&M.onUpdate(M)}P.__version=M.version}function Nt(P,M,B){if(M.image.length!==6)return;const V=qt(P,M),K=M.source;e.bindTexture(i.TEXTURE_CUBE_MAP,P.__webglTexture,i.TEXTURE0+B);const rt=n.get(K);if(K.version!==rt.__version||V===!0){e.activeTexture(i.TEXTURE0+B);const at=$t.getPrimaries($t.workingColorSpace),J=M.colorSpace===""?null:$t.getPrimaries(M.colorSpace),Q=M.colorSpace===""||at===J?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Q);const ot=M.isCompressedTexture||M.image[0].isCompressedTexture,Ct=M.image[0]&&M.image[0].isDataTexture,dt=[];for(let st=0;st<6;st++)!ot&&!Ct?dt[st]=m(M.image[st],!0,s.maxCubemapSize):dt[st]=Ct?M.image[st].image:M.image[st],dt[st]=Fe(M,dt[st]);const lt=dt[0],Rt=r.convert(M.format,M.colorSpace),Lt=r.convert(M.type),Ot=S(M.internalFormat,Rt,Lt,M.normalized,M.colorSpace),F=M.isVideoTexture!==!0,ct=rt.__version===void 0||V===!0,Z=K.dataReady;let ht=y(M,lt);kt(i.TEXTURE_CUBE_MAP,M);let _t;if(ot){F&&ct&&e.texStorage2D(i.TEXTURE_CUBE_MAP,ht,Ot,lt.width,lt.height);for(let st=0;st<6;st++){_t=dt[st].mipmaps;for(let Pt=0;Pt<_t.length;Pt++){const Et=_t[Pt];M.format!==1023?Rt!==null?F?Z&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Pt,0,0,Et.width,Et.height,Rt,Et.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Pt,Ot,Et.width,Et.height,0,Et.data):Dt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):F?Z&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Pt,0,0,Et.width,Et.height,Rt,Lt,Et.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Pt,Ot,Et.width,Et.height,0,Rt,Lt,Et.data)}}}else{if(_t=M.mipmaps,F&&ct){_t.length>0&&ht++;const st=ie(dt[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,ht,Ot,st.width,st.height)}for(let st=0;st<6;st++)if(Ct){F?Z&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,0,0,dt[st].width,dt[st].height,Rt,Lt,dt[st].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,Ot,dt[st].width,dt[st].height,0,Rt,Lt,dt[st].data);for(let Pt=0;Pt<_t.length;Pt++){const ce=_t[Pt].image[st].image;F?Z&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Pt+1,0,0,ce.width,ce.height,Rt,Lt,ce.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Pt+1,Ot,ce.width,ce.height,0,Rt,Lt,ce.data)}}else{F?Z&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,0,0,Rt,Lt,dt[st]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,Ot,Rt,Lt,dt[st]);for(let Pt=0;Pt<_t.length;Pt++){const Et=_t[Pt];F?Z&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Pt+1,0,0,Rt,Lt,Et.image[st]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,Pt+1,Ot,Rt,Lt,Et.image[st])}}}f(M)&&v(i.TEXTURE_CUBE_MAP),rt.__version=K.version,M.onUpdate&&M.onUpdate(M)}P.__version=M.version}function xt(P,M,B,V,K,rt){const at=r.convert(B.format,B.colorSpace),J=r.convert(B.type),Q=S(B.internalFormat,at,J,B.normalized,B.colorSpace),ot=n.get(M),Ct=n.get(B);if(Ct.__renderTarget=M,!ot.__hasExternalTextures){const dt=Math.max(1,M.width>>rt),lt=Math.max(1,M.height>>rt);K===i.TEXTURE_3D||K===i.TEXTURE_2D_ARRAY?e.texImage3D(K,rt,Q,dt,lt,M.depth,0,at,J,null):e.texImage2D(K,rt,Q,dt,lt,0,at,J,null)}e.bindFramebuffer(i.FRAMEBUFFER,P),Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,V,K,Ct.__webglTexture,0,me(M)):(K===i.TEXTURE_2D||K>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&K<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,V,K,Ct.__webglTexture,rt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Gt(P,M,B){if(i.bindRenderbuffer(i.RENDERBUFFER,P),M.depthBuffer){const V=M.depthTexture,K=V&&V.isDepthTexture?V.type:null,rt=E(M.stencilBuffer,K),at=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Me(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,me(M),rt,M.width,M.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,me(M),rt,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,rt,M.width,M.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,at,i.RENDERBUFFER,P)}else{const V=M.textures;for(let K=0;K<V.length;K++){const rt=V[K],at=r.convert(rt.format,rt.colorSpace),J=r.convert(rt.type),Q=S(rt.internalFormat,at,J,rt.normalized,rt.colorSpace);Me(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,me(M),Q,M.width,M.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,me(M),Q,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,Q,M.width,M.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Te(P,M,B){const V=M.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,P),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const K=n.get(M.depthTexture);if(K.__renderTarget=M,(!K.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),V){if(K.__webglInit===void 0&&(K.__webglInit=!0,M.depthTexture.addEventListener("dispose",R)),K.__webglTexture===void 0){K.__webglTexture=i.createTexture(),e.bindTexture(i.TEXTURE_CUBE_MAP,K.__webglTexture),kt(i.TEXTURE_CUBE_MAP,M.depthTexture);const ot=r.convert(M.depthTexture.format),Ct=r.convert(M.depthTexture.type);let dt;M.depthTexture.format===1026?dt=i.DEPTH_COMPONENT24:M.depthTexture.format===1027&&(dt=i.DEPTH24_STENCIL8);for(let lt=0;lt<6;lt++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,dt,M.width,M.height,0,ot,Ct,null)}}else j(M.depthTexture,0);const rt=K.__webglTexture,at=me(M),J=V?i.TEXTURE_CUBE_MAP_POSITIVE_X+B:i.TEXTURE_2D,Q=M.depthTexture.format===1027?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(M.depthTexture.format===1026)Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Q,J,rt,0,at):i.framebufferTexture2D(i.FRAMEBUFFER,Q,J,rt,0);else if(M.depthTexture.format===1027)Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Q,J,rt,0,at):i.framebufferTexture2D(i.FRAMEBUFFER,Q,J,rt,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Vt(P){const M=n.get(P),B=P.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==P.depthTexture){const V=P.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),V){const K=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,V.removeEventListener("dispose",K)};V.addEventListener("dispose",K),M.__depthDisposeCallback=K}M.__boundDepthTexture=V}if(P.depthTexture&&!M.__autoAllocateDepthBuffer)if(B)for(let V=0;V<6;V++)Te(M.__webglFramebuffer[V],P,V);else{const V=P.texture.mipmaps;V&&V.length>0?Te(M.__webglFramebuffer[0],P,0):Te(M.__webglFramebuffer,P,0)}else if(B){M.__webglDepthbuffer=[];for(let V=0;V<6;V++)if(e.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[V]),M.__webglDepthbuffer[V]===void 0)M.__webglDepthbuffer[V]=i.createRenderbuffer(),Gt(M.__webglDepthbuffer[V],P,!1);else{const K=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=M.__webglDepthbuffer[V];i.bindRenderbuffer(i.RENDERBUFFER,rt),i.framebufferRenderbuffer(i.FRAMEBUFFER,K,i.RENDERBUFFER,rt)}}else{const V=P.texture.mipmaps;if(V&&V.length>0?e.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=i.createRenderbuffer(),Gt(M.__webglDepthbuffer,P,!1);else{const K=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=M.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,rt),i.framebufferRenderbuffer(i.FRAMEBUFFER,K,i.RENDERBUFFER,rt)}}e.bindFramebuffer(i.FRAMEBUFFER,null)}function Zt(P,M,B){const V=n.get(P);M!==void 0&&xt(V.__webglFramebuffer,P,P.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),B!==void 0&&Vt(P)}function le(P){const M=P.texture,B=n.get(P),V=n.get(M);P.addEventListener("dispose",x);const K=P.textures,rt=P.isWebGLCubeRenderTarget===!0,at=K.length>1;if(at||(V.__webglTexture===void 0&&(V.__webglTexture=i.createTexture()),V.__version=M.version,a.memory.textures++),rt){B.__webglFramebuffer=[];for(let J=0;J<6;J++)if(M.mipmaps&&M.mipmaps.length>0){B.__webglFramebuffer[J]=[];for(let Q=0;Q<M.mipmaps.length;Q++)B.__webglFramebuffer[J][Q]=i.createFramebuffer()}else B.__webglFramebuffer[J]=i.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){B.__webglFramebuffer=[];for(let J=0;J<M.mipmaps.length;J++)B.__webglFramebuffer[J]=i.createFramebuffer()}else B.__webglFramebuffer=i.createFramebuffer();if(at)for(let J=0,Q=K.length;J<Q;J++){const ot=n.get(K[J]);ot.__webglTexture===void 0&&(ot.__webglTexture=i.createTexture(),a.memory.textures++)}if(P.samples>0&&Me(P)===!1){B.__webglMultisampledFramebuffer=i.createFramebuffer(),B.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let J=0;J<K.length;J++){const Q=K[J];B.__webglColorRenderbuffer[J]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,B.__webglColorRenderbuffer[J]);const ot=r.convert(Q.format,Q.colorSpace),Ct=r.convert(Q.type),dt=S(Q.internalFormat,ot,Ct,Q.normalized,Q.colorSpace,P.isXRRenderTarget===!0),lt=me(P);i.renderbufferStorageMultisample(i.RENDERBUFFER,lt,dt,P.width,P.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+J,i.RENDERBUFFER,B.__webglColorRenderbuffer[J])}i.bindRenderbuffer(i.RENDERBUFFER,null),P.depthBuffer&&(B.__webglDepthRenderbuffer=i.createRenderbuffer(),Gt(B.__webglDepthRenderbuffer,P,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(rt){e.bindTexture(i.TEXTURE_CUBE_MAP,V.__webglTexture),kt(i.TEXTURE_CUBE_MAP,M);for(let J=0;J<6;J++)if(M.mipmaps&&M.mipmaps.length>0)for(let Q=0;Q<M.mipmaps.length;Q++)xt(B.__webglFramebuffer[J][Q],P,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Q);else xt(B.__webglFramebuffer[J],P,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0);f(M)&&v(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(at){for(let J=0,Q=K.length;J<Q;J++){const ot=K[J],Ct=n.get(ot);let dt=i.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(dt=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(dt,Ct.__webglTexture),kt(dt,ot),xt(B.__webglFramebuffer,P,ot,i.COLOR_ATTACHMENT0+J,dt,0),f(ot)&&v(dt)}e.unbindTexture()}else{let J=i.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(J=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(J,V.__webglTexture),kt(J,M),M.mipmaps&&M.mipmaps.length>0)for(let Q=0;Q<M.mipmaps.length;Q++)xt(B.__webglFramebuffer[Q],P,M,i.COLOR_ATTACHMENT0,J,Q);else xt(B.__webglFramebuffer,P,M,i.COLOR_ATTACHMENT0,J,0);f(M)&&v(J),e.unbindTexture()}P.depthBuffer&&Vt(P)}function Xt(P){const M=P.textures;for(let B=0,V=M.length;B<V;B++){const K=M[B];if(f(K)){const rt=T(P),at=n.get(K).__webglTexture;e.bindTexture(rt,at),v(rt),e.unbindTexture()}}}const de=[],Pe=[];function Xe(P){if(P.samples>0){if(Me(P)===!1){const M=P.textures,B=P.width,V=P.height;let K=i.COLOR_BUFFER_BIT;const rt=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,at=n.get(P),J=M.length>1;if(J)for(let ot=0;ot<M.length;ot++)e.bindFramebuffer(i.FRAMEBUFFER,at.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ot,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,at.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ot,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,at.__webglMultisampledFramebuffer);const Q=P.texture.mipmaps;Q&&Q.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,at.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,at.__webglFramebuffer);for(let ot=0;ot<M.length;ot++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(K|=i.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(K|=i.STENCIL_BUFFER_BIT)),J){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,at.__webglColorRenderbuffer[ot]);const Ct=n.get(M[ot]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ct,0)}i.blitFramebuffer(0,0,B,V,0,0,B,V,K,i.NEAREST),l===!0&&(de.length=0,Pe.length=0,de.push(i.COLOR_ATTACHMENT0+ot),P.depthBuffer&&P.storeMultisampledDepthBuffer===!1&&(de.push(rt),Pe.push(rt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Pe)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,de))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),J)for(let ot=0;ot<M.length;ot++){e.bindFramebuffer(i.FRAMEBUFFER,at.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ot,i.RENDERBUFFER,at.__webglColorRenderbuffer[ot]);const Ct=n.get(M[ot]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,at.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ot,i.TEXTURE_2D,Ct,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,at.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.storeMultisampledDepthBuffer===!1&&l){const M=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[M])}}}function me(P){return Math.min(s.maxSamples,P.samples)}function Me(P){const M=n.get(P);return P.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function O(P){const M=a.render.frame;h.get(P)!==M&&(h.set(P,M),P.update())}function Fe(P,M){const B=P.colorSpace,V=P.format,K=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||B!==Zs&&B!==""&&($t.getTransfer(B)===ee?(V!==1023||K!==1009)&&Dt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Yt("WebGLTextures: Unsupported texture color space:",B)),M}function ie(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=$,this.resetTextureUnits=U,this.getTextureUnits=L,this.setTextureUnits=k,this.setTexture2D=j,this.setTexture2DArray=X,this.setTexture3D=tt,this.setTextureCube=et,this.rebindTextures=Zt,this.setupRenderTarget=le,this.updateRenderTargetMipmap=Xt,this.updateMultisampleRenderTarget=Xe,this.setupDepthRenderbuffer=Vt,this.setupFrameBufferTexture=xt,this.useMultisampledRTT=Me,this.isReversedDepthBuffer=function(){return e.buffers.depth.getReversed()}}function i0(i,t){function e(n,s=""){let r;const a=$t.getTransfer(s);if(n===1009)return i.UNSIGNED_BYTE;if(n===1017)return i.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return i.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return i.BYTE;if(n===1011)return i.SHORT;if(n===1012)return i.UNSIGNED_SHORT;if(n===1013)return i.INT;if(n===1014)return i.UNSIGNED_INT;if(n===1015)return i.FLOAT;if(n===1016)return i.HALF_FLOAT;if(n===1021)return i.ALPHA;if(n===1022)return i.RGB;if(n===1023)return i.RGBA;if(n===1026)return i.DEPTH_COMPONENT;if(n===1027)return i.DEPTH_STENCIL;if(n===1028)return i.RED;if(n===1029)return i.RED_INTEGER;if(n===1030)return i.RG;if(n===1031)return i.RG_INTEGER;if(n===1033)return i.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779)if(a===ee)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===33776)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===33776)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===35840||n===35841||n===35842||n===35843)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===35840)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===36196||n===37492)return a===ee?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===37496)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return r.COMPRESSED_R11_EAC;if(n===37489)return r.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return r.COMPRESSED_RG11_EAC;if(n===37491)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===37808)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===ee?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===36492||n===36494||n===36495)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===36492)return a===ee?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===36283||n===36284||n===36285||n===36286)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===36283)return r.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===1020?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}const s0=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,r0=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class a0{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){const n=new nc(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Ae({vertexShader:s0,fragmentShader:r0,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new pt(new Ln(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class o0 extends ni{constructor(t,e){super();const n=this;let s=null,r=1,a=null,o="local-floor",l=1,c=null,h=null,u=null,d=null,p=null,g=null;const _=typeof XRWebGLBinding<"u",m=new a0,f={},v=e.getContextAttributes();let T=null,S=null;const E=[],y=[],R=new ut;let x=null,w=null;const C=new sn;C.viewport=new pe;const I=new sn;I.viewport=new pe;const A=[C,I],U=new du;let L=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let it=E[Y];return it===void 0&&(it=new br,E[Y]=it),it.getTargetRaySpace()},this.getControllerGrip=function(Y){let it=E[Y];return it===void 0&&(it=new br,E[Y]=it),it.getGripSpace()},this.getHand=function(Y){let it=E[Y];return it===void 0&&(it=new br,E[Y]=it),it.getHandSpace()};function $(Y){const it=y.indexOf(Y.inputSource);if(it===-1)return;const St=E[it];St!==void 0&&(St.update(Y.inputSource,Y.frame,c||a),St.dispatchEvent({type:Y.type,data:Y.inputSource}))}function H(){s.removeEventListener("select",$),s.removeEventListener("selectstart",$),s.removeEventListener("selectend",$),s.removeEventListener("squeeze",$),s.removeEventListener("squeezestart",$),s.removeEventListener("squeezeend",$),s.removeEventListener("end",H),s.removeEventListener("inputsourceschange",j);for(let Y=0;Y<E.length;Y++){const it=y[Y];it!==null&&(y[Y]=null,E[Y].disconnect(it))}L=null,k=null,m.reset();for(const Y in f)delete f[Y];if(t.setRenderTarget(T),p=null,d=null,u=null,s=null,S=null,qt.stop(),n.isPresenting=!1,t.setPixelRatio(x),t.setSize(R.width,R.height,!1),w!==null){const Y=w.camera;Y.fov=w.fov,Y.zoom=w.zoom,Y.updateProjectionMatrix(),w=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){r=Y,n.isPresenting===!0&&Dt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){o=Y,n.isPresenting===!0&&Dt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(Y){c=Y},this.getBaseLayer=function(){return d!==null?d:p},this.getBinding=function(){return u===null&&_&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Y){if(s=Y,s!==null){if(T=t.getRenderTarget(),s.addEventListener("select",$),s.addEventListener("selectstart",$),s.addEventListener("selectend",$),s.addEventListener("squeeze",$),s.addEventListener("squeezestart",$),s.addEventListener("squeezeend",$),s.addEventListener("end",H),s.addEventListener("inputsourceschange",j),v.xrCompatible!==!0&&await e.makeXRCompatible(),x=t.getPixelRatio(),t.getSize(R),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let St=null,Nt=null,xt=null;v.depth&&(xt=v.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,St=v.stencil?1027:1026,Nt=v.stencil?1020:1014);const Gt={colorFormat:e.RGBA8,depthFormat:xt,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Gt),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),S=new We(d.textureWidth,d.textureHeight,{format:1023,type:1009,depthTexture:new is(d.textureWidth,d.textureHeight,Nt,void 0,void 0,void 0,void 0,void 0,void 0,St),stencilBuffer:v.stencil,colorSpace:t.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{const St={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:r};p=new XRWebGLLayer(s,e,St),s.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),S=new We(p.framebufferWidth,p.framebufferHeight,{format:1023,type:1009,colorSpace:t.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await s.requestReferenceSpace(o),qt.setContext(s),qt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function j(Y){for(let it=0;it<Y.removed.length;it++){const St=Y.removed[it],Nt=y.indexOf(St);Nt>=0&&(y[Nt]=null,E[Nt].disconnect(St))}for(let it=0;it<Y.added.length;it++){const St=Y.added[it];let Nt=y.indexOf(St);if(Nt===-1){for(let Gt=0;Gt<E.length;Gt++)if(Gt>=y.length){y.push(St),Nt=Gt;break}else if(y[Gt]===null){y[Gt]=St,Nt=Gt;break}if(Nt===-1)break}const xt=E[Nt];xt&&xt.connect(St)}}const X=new D,tt=new D;function et(Y,it,St){X.setFromMatrixPosition(it.matrixWorld),tt.setFromMatrixPosition(St.matrixWorld);const Nt=X.distanceTo(tt),xt=it.projectionMatrix.elements,Gt=St.projectionMatrix.elements,Te=xt[14]/(xt[10]-1),Vt=xt[14]/(xt[10]+1),Zt=(xt[9]+1)/xt[5],le=(xt[9]-1)/xt[5],Xt=(xt[8]-1)/xt[0],de=(Gt[8]+1)/Gt[0],Pe=Te*Xt,Xe=Te*de,me=Nt/(-Xt+de),Me=me*-Xt;if(it.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(Me),Y.translateZ(me),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),xt[10]===-1)Y.projectionMatrix.copy(it.projectionMatrix),Y.projectionMatrixInverse.copy(it.projectionMatrixInverse);else{const O=Te+me,Fe=Vt+me,ie=Pe-Me,P=Xe+(Nt-Me),M=Zt*Vt/Fe*O,B=le*Vt/Fe*O;Y.projectionMatrix.makePerspective(ie,P,M,B,O,Fe),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function yt(Y,it){it===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(it.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(s===null)return;let it=Y.near,St=Y.far;m.texture!==null&&(m.depthNear>0&&(it=m.depthNear),m.depthFar>0&&(St=m.depthFar)),U.near=I.near=C.near=it,U.far=I.far=C.far=St,(L!==U.near||k!==U.far)&&(s.updateRenderState({depthNear:U.near,depthFar:U.far}),L=U.near,k=U.far),U.layers.mask=Y.layers.mask|6,C.layers.mask=U.layers.mask&-5,I.layers.mask=U.layers.mask&-3;const Nt=Y.parent,xt=U.cameras;yt(U,Nt);for(let Gt=0;Gt<xt.length;Gt++)yt(xt[Gt],Nt);xt.length===2?et(U,C,I):U.projectionMatrix.copy(C.projectionMatrix),w===null&&Y.isPerspectiveCamera&&(w={camera:Y,fov:Y.fov,zoom:Y.zoom}),wt(Y,U,Nt)};function wt(Y,it,St){St===null?Y.matrix.copy(it.matrixWorld):(Y.matrix.copy(St.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(it.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(it.projectionMatrix),Y.projectionMatrixInverse.copy(it.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=oa*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return U},this.getFoveation=function(){if(!(d===null&&p===null))return l},this.setFoveation=function(Y){l=Y,d!==null&&(d.fixedFoveation=Y),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=Y)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(U)},this.getCameraTexture=function(Y){return f[Y]};let ne=null;function kt(Y,it){if(h=it.getViewerPose(c||a),g=it,h!==null){const St=h.views;p!==null&&(t.setRenderTargetFramebuffer(S,p.framebuffer),t.setRenderTarget(S));let Nt=!1;St.length!==U.cameras.length&&(U.cameras.length=0,Nt=!0);for(let Vt=0;Vt<St.length;Vt++){const Zt=St[Vt];let le=null;if(p!==null)le=p.getViewport(Zt);else{const de=u.getViewSubImage(d,Zt);le=de.viewport,Vt===0&&(t.setRenderTargetTextures(S,de.colorTexture,de.depthStencilTexture),t.setRenderTarget(S))}let Xt=A[Vt];Xt===void 0&&(Xt=new sn,Xt.layers.enable(Vt),Xt.viewport=new pe,A[Vt]=Xt),Xt.matrix.fromArray(Zt.transform.matrix),Xt.matrix.decompose(Xt.position,Xt.quaternion,Xt.scale),Xt.projectionMatrix.fromArray(Zt.projectionMatrix),Xt.projectionMatrixInverse.copy(Xt.projectionMatrix).invert(),Xt.viewport.set(le.x,le.y,le.width,le.height),Vt===0&&(U.matrix.copy(Xt.matrix),U.matrix.decompose(U.position,U.quaternion,U.scale)),Nt===!0&&U.cameras.push(Xt)}const xt=s.enabledFeatures;if(xt&&xt.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&_){u=n.getBinding();const Vt=u.getDepthInformation(St[0]);Vt&&Vt.isValid&&Vt.texture&&m.init(Vt,s.renderState)}if(xt&&xt.includes("camera-access")&&_){t.state.unbindTexture(),u=n.getBinding();for(let Vt=0;Vt<St.length;Vt++){const Zt=St[Vt].camera;if(Zt){let le=f[Zt];le||(le=new nc,f[Zt]=le);const Xt=u.getCameraImage(Zt);le.sourceTexture=Xt}}}}for(let St=0;St<E.length;St++){const Nt=y[St],xt=E[St];Nt!==null&&xt!==void 0&&xt.update(Nt,it,c||a)}ne&&ne(Y,it),it.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:it}),g=null}const qt=new uc;qt.setAnimationLoop(kt),this.setAnimationLoop=function(Y){ne=Y},this.dispose=function(){}}}const l0=new se,vc=new Ft;vc.set(-1,0,0,0,1,0,0,0,1);function c0(i,t){function e(m,f){m.matrixAutoUpdate===!0&&m.updateMatrix(),f.value.copy(m.matrix)}function n(m,f){f.color.getRGB(m.fogColor.value,oc(i)),f.isFog?(m.fogNear.value=f.near,m.fogFar.value=f.far):f.isFogExp2&&(m.fogDensity.value=f.density)}function s(m,f,v,T,S){f.isNodeMaterial?f.uniformsNeedUpdate=!1:f.isMeshBasicMaterial?r(m,f):f.isMeshLambertMaterial?(r(m,f),f.envMap&&(m.envMapIntensity.value=f.envMapIntensity)):f.isMeshToonMaterial?(r(m,f),u(m,f)):f.isMeshPhongMaterial?(r(m,f),h(m,f),f.envMap&&(m.envMapIntensity.value=f.envMapIntensity)):f.isMeshStandardMaterial?(r(m,f),d(m,f),f.isMeshPhysicalMaterial&&p(m,f,S)):f.isMeshMatcapMaterial?(r(m,f),g(m,f)):f.isMeshDepthMaterial?r(m,f):f.isMeshDistanceMaterial?(r(m,f),_(m,f)):f.isMeshNormalMaterial?r(m,f):f.isLineBasicMaterial?(a(m,f),f.isLineDashedMaterial&&o(m,f)):f.isPointsMaterial?l(m,f,v,T):f.isSpriteMaterial?c(m,f):f.isShadowMaterial?(m.color.value.copy(f.color),m.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(m,f){m.opacity.value=f.opacity,f.color&&m.diffuse.value.copy(f.color),f.emissive&&m.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(m.map.value=f.map,e(f.map,m.mapTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,e(f.alphaMap,m.alphaMapTransform)),f.bumpMap&&(m.bumpMap.value=f.bumpMap,e(f.bumpMap,m.bumpMapTransform),m.bumpScale.value=f.bumpScale,f.side===1&&(m.bumpScale.value*=-1)),f.normalMap&&(m.normalMap.value=f.normalMap,e(f.normalMap,m.normalMapTransform),m.normalScale.value.copy(f.normalScale),f.side===1&&m.normalScale.value.negate()),f.displacementMap&&(m.displacementMap.value=f.displacementMap,e(f.displacementMap,m.displacementMapTransform),m.displacementScale.value=f.displacementScale,m.displacementBias.value=f.displacementBias),f.emissiveMap&&(m.emissiveMap.value=f.emissiveMap,e(f.emissiveMap,m.emissiveMapTransform)),f.specularMap&&(m.specularMap.value=f.specularMap,e(f.specularMap,m.specularMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest);const v=t.get(f),T=v.envMap,S=v.envMapRotation;T&&(m.envMap.value=T,m.envMapRotation.value.setFromMatrix4(l0.makeRotationFromEuler(S)).transpose(),T.isCubeTexture&&T.isRenderTargetTexture===!1&&m.envMapRotation.value.premultiply(vc),m.reflectivity.value=f.reflectivity,m.ior.value=f.ior,m.refractionRatio.value=f.refractionRatio),f.lightMap&&(m.lightMap.value=f.lightMap,m.lightMapIntensity.value=f.lightMapIntensity,e(f.lightMap,m.lightMapTransform)),f.aoMap&&(m.aoMap.value=f.aoMap,m.aoMapIntensity.value=f.aoMapIntensity,e(f.aoMap,m.aoMapTransform))}function a(m,f){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,f.map&&(m.map.value=f.map,e(f.map,m.mapTransform))}function o(m,f){m.dashSize.value=f.dashSize,m.totalSize.value=f.dashSize+f.gapSize,m.scale.value=f.scale}function l(m,f,v,T){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,m.size.value=f.size*v,m.scale.value=T*.5,f.map&&(m.map.value=f.map,e(f.map,m.uvTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,e(f.alphaMap,m.alphaMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest)}function c(m,f){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,m.rotation.value=f.rotation,f.map&&(m.map.value=f.map,e(f.map,m.mapTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,e(f.alphaMap,m.alphaMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest)}function h(m,f){m.specular.value.copy(f.specular),m.shininess.value=Math.max(f.shininess,1e-4)}function u(m,f){f.gradientMap&&(m.gradientMap.value=f.gradientMap)}function d(m,f){m.metalness.value=f.metalness,f.metalnessMap&&(m.metalnessMap.value=f.metalnessMap,e(f.metalnessMap,m.metalnessMapTransform)),m.roughness.value=f.roughness,f.roughnessMap&&(m.roughnessMap.value=f.roughnessMap,e(f.roughnessMap,m.roughnessMapTransform)),f.envMap&&(m.envMapIntensity.value=f.envMapIntensity)}function p(m,f,v){m.ior.value=f.ior,f.sheen>0&&(m.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),m.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(m.sheenColorMap.value=f.sheenColorMap,e(f.sheenColorMap,m.sheenColorMapTransform)),f.sheenRoughnessMap&&(m.sheenRoughnessMap.value=f.sheenRoughnessMap,e(f.sheenRoughnessMap,m.sheenRoughnessMapTransform))),f.clearcoat>0&&(m.clearcoat.value=f.clearcoat,m.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(m.clearcoatMap.value=f.clearcoatMap,e(f.clearcoatMap,m.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,e(f.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(m.clearcoatNormalMap.value=f.clearcoatNormalMap,e(f.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===1&&m.clearcoatNormalScale.value.negate())),f.dispersion>0&&(m.dispersion.value=f.dispersion),f.retroreflectivity>0&&(m.retroreflectivity.value=f.retroreflectivity),f.iridescence>0&&(m.iridescence.value=f.iridescence,m.iridescenceIOR.value=f.iridescenceIOR,m.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(m.iridescenceMap.value=f.iridescenceMap,e(f.iridescenceMap,m.iridescenceMapTransform)),f.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=f.iridescenceThicknessMap,e(f.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),f.transmission>0&&(m.transmission.value=f.transmission,m.transmissionSamplerMap.value=v.texture,m.transmissionSamplerSize.value.set(v.width,v.height),f.transmissionMap&&(m.transmissionMap.value=f.transmissionMap,e(f.transmissionMap,m.transmissionMapTransform)),m.thickness.value=f.thickness,f.thicknessMap&&(m.thicknessMap.value=f.thicknessMap,e(f.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=f.attenuationDistance,m.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(m.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(m.anisotropyMap.value=f.anisotropyMap,e(f.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=f.specularIntensity,m.specularColor.value.copy(f.specularColor),f.specularColorMap&&(m.specularColorMap.value=f.specularColorMap,e(f.specularColorMap,m.specularColorMapTransform)),f.specularIntensityMap&&(m.specularIntensityMap.value=f.specularIntensityMap,e(f.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,f){f.matcap&&(m.matcap.value=f.matcap)}function _(m,f){const v=t.get(f).light;m.referencePosition.value.setFromMatrixPosition(v.matrixWorld),m.nearDistance.value=v.shadow.camera.near,m.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function h0(i,t,e,n){let s={},r={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(S,E){const y=E.program;n.uniformBlockBinding(S,y)}function c(S,E){let y=s[S.id];y===void 0&&(m(S),y=h(S),s[S.id]=y,S.addEventListener("dispose",v));const R=E.program;n.updateUBOMapping(S,R);const x=t.render.frame;r[S.id]!==x&&(d(S),r[S.id]=x)}function h(S){const E=u();S.__bindingPointIndex=E;const y=i.createBuffer(),R=S.__size,x=S.usage;return i.bindBuffer(i.UNIFORM_BUFFER,y),i.bufferData(i.UNIFORM_BUFFER,R,x),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,E,y),y}function u(){for(let S=0;S<o;S++)if(a.indexOf(S)===-1)return a.push(S),S;return Yt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(S){const E=s[S.id],y=S.uniforms,R=S.__cache;i.bindBuffer(i.UNIFORM_BUFFER,E);for(let x=0,w=y.length;x<w;x++){const C=y[x];if(Array.isArray(C))for(let I=0,A=C.length;I<A;I++)p(C[I],x,I,R);else p(C,x,0,R)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function p(S,E,y,R){if(_(S,E,y,R)===!0){const x=S.__offset,w=S.value;if(Array.isArray(w)){let C=0;for(let I=0;I<w.length;I++){const A=w[I],U=f(A);g(A,S.__data,C),typeof A!="number"&&typeof A!="boolean"&&!A.isMatrix3&&!ArrayBuffer.isView(A)&&(C+=U.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(w,S.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,x,S.__data)}}function g(S,E,y){typeof S=="number"||typeof S=="boolean"?E[0]=S:S.isMatrix3?(E[0]=S.elements[0],E[1]=S.elements[1],E[2]=S.elements[2],E[3]=0,E[4]=S.elements[3],E[5]=S.elements[4],E[6]=S.elements[5],E[7]=0,E[8]=S.elements[6],E[9]=S.elements[7],E[10]=S.elements[8],E[11]=0):ArrayBuffer.isView(S)?E.set(new S.constructor(S.buffer,S.byteOffset,E.length)):S.toArray(E,y)}function _(S,E,y,R){const x=S.value,w=E+"_"+y;if(R[w]===void 0)return typeof x=="number"||typeof x=="boolean"?R[w]=x:ArrayBuffer.isView(x)?R[w]=x.slice():R[w]=x.clone(),!0;{const C=R[w];if(typeof x=="number"||typeof x=="boolean"){if(C!==x)return R[w]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(C.equals(x)===!1)return C.copy(x),!0}}return!1}function m(S){const E=S.uniforms;let y=0;const R=16;for(let w=0,C=E.length;w<C;w++){const I=Array.isArray(E[w])?E[w]:[E[w]];for(let A=0,U=I.length;A<U;A++){const L=I[A],k=Array.isArray(L.value)?L.value:[L.value];for(let $=0,H=k.length;$<H;$++){const j=k[$],X=f(j),tt=y%R,et=tt%X.boundary,yt=tt+et;y+=et,yt!==0&&R-yt<X.storage&&(y+=R-yt),L.__data=new Float32Array(X.storage/Float32Array.BYTES_PER_ELEMENT),L.__offset=y,y+=X.storage}}}const x=y%R;return x>0&&(y+=R-x),S.__size=y,S.__cache={},this}function f(S){const E={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(E.boundary=4,E.storage=4):S.isVector2?(E.boundary=8,E.storage=8):S.isVector3||S.isColor?(E.boundary=16,E.storage=12):S.isVector4?(E.boundary=16,E.storage=16):S.isMatrix3?(E.boundary=48,E.storage=48):S.isMatrix4?(E.boundary=64,E.storage=64):S.isTexture?Dt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(S)?(E.boundary=16,E.storage=S.byteLength):Dt("WebGLRenderer: Unsupported uniform value type.",S),E}function v(S){const E=S.target;E.removeEventListener("dispose",v);const y=a.indexOf(E.__bindingPointIndex);a.splice(y,1),i.deleteBuffer(s[E.id]),delete s[E.id],delete r[E.id]}function T(){for(const S in s)i.deleteBuffer(s[S]);a=[],s={},r={}}return{bind:l,update:c,dispose:T}}const u0=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let mn=null;function d0(){return mn===null&&(mn=new tc(u0,16,16,1030,1016),mn.name="DFG_LUT",mn.minFilter=1006,mn.magFilter=1006,mn.wrapS=1001,mn.wrapT=1001,mn.generateMipmaps=!1,mn.needsUpdate=!0),mn}class jg{constructor(t={}){const{canvas:e=sh(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:p=1009}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=a;const _=p,m=new Set([1033,1031,1029]),f=new Set([1009,1014,1012,1020,1017,1018]),v=new Uint32Array(4),T=new Int32Array(4),S=new D;let E=null,y=null;const R=[],x=[];let w=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const C=this;let I=!1,A=null,U=null,L=null,k=null;this._outputColorSpace=Ue;let $=0,H=0,j=null,X=-1,tt=null;const et=new pe,yt=new pe;let wt=null;const ne=new It(0);let kt=0,qt=e.width,Y=e.height,it=1,St=null,Nt=null;const xt=new pe(0,0,qt,Y),Gt=new pe(0,0,qt,Y);let Te=!1;const Vt=new Ca;let Zt=!1,le=!1;const Xt=new se,de=new D,Pe=new pe,Xe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let me=!1;function Me(){return j===null?it:1}let O=n;function Fe(b,N){return e.getContext(b,N)}let ie,P,M,B,V,K,rt,at,J,Q,ot,Ct,dt,lt,Rt,Lt,Ot,F,ct,Z,ht,_t,st;try{const b={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine","three.js r186"),e.addEventListener("webglcontextlost",ce,!1),e.addEventListener("webglcontextrestored",jt,!1),e.addEventListener("webglcontextcreationerror",an,!1),O===null){const N="webgl2";if(O=Fe(N,b),O===null)throw Fe(N)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Pt()}catch(b){throw e.removeEventListener("webglcontextlost",ce,!1),e.removeEventListener("webglcontextrestored",jt,!1),e.removeEventListener("webglcontextcreationerror",an,!1),Yt("WebGLRenderer: "+b.message),b}function Pt(){ie=new dp(O),ie.init(),ht=new i0(O,ie),P=new np(O,ie,t,ht),M=new e0(O,ie),P.reversedDepthBuffer&&d&&M.buffers.depth.setReversed(!0),U=O.createFramebuffer(),L=O.createFramebuffer(),k=O.createFramebuffer(),B=new mp(O),V=new Gm,K=new n0(O,ie,M,V,P,ht,B),rt=new up(C),at=new gu(O),_t=new tp(O,at),J=new fp(O,at,B,_t),Q=new _p(O,J,at,_t,B),F=new gp(O,P,K),Rt=new ip(V),ot=new zm(C,rt,ie,P,_t,Rt),Ct=new c0(C,V),dt=new Vm,lt=new Km(ie),Ot=new jf(C,rt,M,Q,g,l),Lt=new t0(C,Q,P),st=new h0(O,B,P,M),ct=new ep(O,ie,B),Z=new pp(O,ie,B),B.programs=ot.programs,C.capabilities=P,C.extensions=ie,C.properties=V,C.renderLists=dt,C.shadowMap=Lt,C.state=M,C.info=B}_!==1009&&(w=new xp(_,e.width,e.height,o,s,r));const Et=new o0(C,O);this.xr=Et,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){const b=ie.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){const b=ie.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return it},this.setPixelRatio=function(b){b!==void 0&&(it=b,this.setSize(qt,Y,!1))},this.getSize=function(b){return b.set(qt,Y)},this.setSize=function(b,N,W=!0){if(Et.isPresenting){Dt("WebGLRenderer: Can't change size while VR device is presenting.");return}qt=b,Y=N,e.width=Math.floor(b*it),e.height=Math.floor(N*it),W===!0&&(e.style.width=b+"px",e.style.height=N+"px"),w!==null&&w.setSize(e.width,e.height),this.setViewport(0,0,b,N)},this.getDrawingBufferSize=function(b){return b.set(qt*it,Y*it).floor()},this.setDrawingBufferSize=function(b,N,W){qt=b,Y=N,it=W,e.width=Math.floor(b*W),e.height=Math.floor(N*W),this.setViewport(0,0,b,N)},this.setEffects=function(b){if(_===1009){Yt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let N=0;N<b.length;N++)if(b[N].isOutputPass===!0){Dt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}w.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(et)},this.getViewport=function(b){return b.copy(xt)},this.setViewport=function(b,N,W,z){b.isVector4?xt.set(b.x,b.y,b.z,b.w):xt.set(b,N,W,z),M.viewport(et.copy(xt).multiplyScalar(it).round())},this.getScissor=function(b){return b.copy(Gt)},this.setScissor=function(b,N,W,z){b.isVector4?Gt.set(b.x,b.y,b.z,b.w):Gt.set(b,N,W,z),M.scissor(yt.copy(Gt).multiplyScalar(it).round())},this.getScissorTest=function(){return Te},this.setScissorTest=function(b){M.setScissorTest(Te=b)},this.setOpaqueSort=function(b){St=b},this.setTransparentSort=function(b){Nt=b},this.getClearColor=function(b){return b.copy(Ot.getClearColor())},this.setClearColor=function(){Ot.setClearColor(...arguments)},this.getClearAlpha=function(){return Ot.getClearAlpha()},this.setClearAlpha=function(){Ot.setClearAlpha(...arguments)},this.clear=function(b=!0,N=!0,W=!0){let z=0;if(b){let G=!1;if(j!==null){const gt=j.texture.format;G=m.has(gt)}if(G){const gt=j.texture.type,Mt=f.has(gt),mt=Ot.getClearColor(),bt=Ot.getClearAlpha(),At=mt.r,Bt=mt.g,Wt=mt.b;Mt?(v[0]=At,v[1]=Bt,v[2]=Wt,v[3]=bt,O.clearBufferuiv(O.COLOR,0,v)):(T[0]=At,T[1]=Bt,T[2]=Wt,T[3]=bt,O.clearBufferiv(O.COLOR,0,T))}else z|=O.COLOR_BUFFER_BIT}N&&(z|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),W&&(z|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z!==0&&O.clear(z)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(b){b.setRenderer(this),A=b},this.dispose=function(){e.removeEventListener("webglcontextlost",ce,!1),e.removeEventListener("webglcontextrestored",jt,!1),e.removeEventListener("webglcontextcreationerror",an,!1),Ot.dispose(),dt.dispose(),lt.dispose(),V.dispose(),rt.dispose(),Q.dispose(),_t.dispose(),st.dispose(),ot.dispose(),Et.dispose(),Et.removeEventListener("sessionstart",Qa),Et.removeEventListener("sessionend",ja),Yn.stop()};function ce(b){b.preventDefault(),js("WebGLRenderer: Context Lost."),I=!0}function jt(){js("WebGLRenderer: Context Restored."),I=!1;const b=B.autoReset,N=Lt.enabled,W=Lt.autoUpdate,z=Lt.needsUpdate,G=Lt.type;Pt(),B.autoReset=b,Lt.enabled=N,Lt.autoUpdate=W,Lt.needsUpdate=z,Lt.type=G}function an(b){Yt("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function dn(b){const N=b.target;N.removeEventListener("dispose",dn),Yc(N)}function Yc(b){Kc(b),V.remove(b)}function Kc(b){const N=V.get(b).programs;N!==void 0&&(N.forEach(function(W){ot.releaseProgram(W)}),b.isShaderMaterial&&ot.releaseShaderCache(b))}this.renderBufferDirect=function(b,N,W,z,G,gt){N===null&&(N=Xe);const Mt=G.isMesh&&G.matrixWorld.determinantAffine()<0,mt=Qc(b,N,W,z,G);M.setMaterial(z,Mt);let bt=W.index,At=1;if(z.wireframe===!0){if(bt=J.getWireframeAttribute(W),bt===void 0)return;At=2}const Bt=W.drawRange,Wt=W.attributes.position;let Tt=Bt.start*At,te=(Bt.start+Bt.count)*At;gt!==null&&(Tt=Math.max(Tt,gt.start*At),te=Math.min(te,(gt.start+gt.count)*At)),bt!==null?(Tt=Math.max(Tt,0),te=Math.min(te,bt.count)):Wt!=null&&(Tt=Math.max(Tt,0),te=Math.min(te,Wt.count));const Se=te-Tt;if(Se<0||Se===1/0)return;_t.setup(G,z,mt,W,bt);let ue,oe=ct;if(bt!==null&&(ue=at.get(bt),oe=Z,oe.setIndex(ue)),G.isMesh)z.wireframe===!0?(M.setLineWidth(z.wireframeLinewidth*Me()),oe.setMode(O.LINES)):oe.setMode(O.TRIANGLES);else if(G.isLine){let Oe=z.linewidth;Oe===void 0&&(Oe=1),M.setLineWidth(Oe*Me()),G.isLineSegments?oe.setMode(O.LINES):G.isLineLoop?oe.setMode(O.LINE_LOOP):oe.setMode(O.LINE_STRIP)}else G.isPoints?oe.setMode(O.POINTS):G.isSprite&&oe.setMode(O.TRIANGLES);if(G.isBatchedMesh)if(ie.get("WEBGL_multi_draw"))oe.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{const Oe=G._multiDrawStarts,vt=G._multiDrawCounts,ze=G._multiDrawCount,Kt=bt?at.get(bt).bytesPerElement:1,Qe=V.get(z).currentProgram.getUniforms();for(let fn=0;fn<ze;fn++)Qe.setValue(O,"_gl_DrawID",fn),oe.render(Oe[fn]/Kt,vt[fn])}else if(G.isInstancedMesh)oe.renderInstances(Tt,Se,G.count);else if(W.isInstancedBufferGeometry){const Oe=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,vt=Math.min(W.instanceCount,Oe);oe.renderInstances(Tt,Se,vt)}else oe.render(Tt,Se)};function Za(b,N,W,z){A!==null&&b.isNodeMaterial&&A.setObject(z,b),Zt===!0&&Rt.setState(b,W,!1),b.transparent===!0&&b.side===2&&b.forceSinglePass===!1?(b.side=1,b.needsUpdate=!0,ps(b,N,z),b.side=0,b.needsUpdate=!0,ps(b,N,z),b.side=2):ps(b,N,z)}this.compile=function(b,N,W=null){W===null&&(W=b),A!==null&&A.renderStart(b,N,W),y=lt.get(W),y.init(N),x.push(y),W.traverseVisible(function(G){G.isLight&&G.layers.test(N.layers)&&(y.pushLight(G),G.castShadow&&y.pushShadow(G))}),b!==W&&b.traverseVisible(function(G){G.isLight&&G.layers.test(N.layers)&&(y.pushLight(G),G.castShadow&&y.pushShadow(G))}),y.setupLights(),A!==null&&A.updateLights(y.state.lightsArray),le=this.localClippingEnabled,Zt=Rt.init(this.clippingPlanes,le),Zt===!0&&Rt.setGlobalState(this.clippingPlanes,N),A!==null&&Lt.render(y.state.shadowsArray,W,N);const z=new Set;return b.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;const gt=G.material;if(gt)if(Array.isArray(gt))for(let Mt=0;Mt<gt.length;Mt++){const mt=gt[Mt];Za(mt,W,N,G),z.add(mt)}else Za(gt,W,N,G),z.add(gt)}),y=x.pop(),A!==null&&A.renderEnd(),z},this.compileAsync=function(b,N,W=null){const z=this.compile(b,N,W);return new Promise(G=>{function gt(){if(z.forEach(function(Mt){const bt=V.get(Mt).currentProgram;(bt===void 0||bt.isReady())&&z.delete(Mt)}),z.size===0){G(b);return}setTimeout(gt,10)}ie.get("KHR_parallel_shader_compile")!==null?gt():setTimeout(gt,10)})};let pr=null;function Jc(b){pr&&pr(b)}function Qa(){Yn.stop()}function ja(){Yn.start()}const Yn=new uc;Yn.setAnimationLoop(Jc),typeof self<"u"&&Yn.setContext(self),this.setAnimationLoop=function(b){pr=b,Et.setAnimationLoop(b),b===null?Yn.stop():Yn.start()},Et.addEventListener("sessionstart",Qa),Et.addEventListener("sessionend",ja),this.render=function(b,N){if(N!==void 0&&N.isCamera!==!0){Yt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;A!==null&&A.renderStart(b,N);const W=Et.enabled===!0&&Et.isPresenting===!0,z=w!==null&&(j===null||W)&&w.begin(C,j);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),N.parent===null&&N.matrixWorldAutoUpdate===!0&&N.updateMatrixWorld(),Et.enabled===!0&&Et.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(Et.cameraAutoUpdate===!0&&Et.updateCamera(N),N=Et.getCamera()),b.isScene===!0&&b.onBeforeRender(C,b,N,j),y=lt.get(b,x.length),y.init(N),y.state.textureUnits=K.getTextureUnits(),x.push(y),Xt.multiplyMatrices(N.projectionMatrix,N.matrixWorldInverse),Vt.setFromProjectionMatrix(Xt,2e3,N.reversedDepth),le=this.localClippingEnabled,Zt=Rt.init(this.clippingPlanes,le),E=dt.get(b,R.length),E.init(),R.push(E),Et.enabled===!0&&Et.isPresenting===!0){const Mt=C.xr.getDepthSensingMesh();Mt!==null&&mr(Mt,N,-1/0,C.sortObjects)}mr(b,N,0,C.sortObjects),E.finish(),A!==null&&A.updateLights(y.state.lightsArray),C.sortObjects===!0&&E.sort(St,Nt),me=Et.enabled===!1||Et.isPresenting===!1||Et.hasDepthSensing()===!1,me&&Ot.addToRenderList(E,b),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Zt===!0&&Rt.beginShadows();const G=y.state.shadowsArray;if(Lt.render(G,b,N),Zt===!0&&Rt.endShadows(),(z&&w.hasRenderPass())===!1){const Mt=E.opaque,mt=E.transmissive;if(y.setupLights(),N.isArrayCamera){const bt=N.cameras;if(mt.length>0)for(let At=0,Bt=bt.length;At<Bt;At++){const Wt=bt[At];eo(Mt,mt,b,Wt)}me&&Ot.render(b);for(let At=0,Bt=bt.length;At<Bt;At++){const Wt=bt[At];to(E,b,Wt,Wt.viewport)}}else mt.length>0&&eo(Mt,mt,b,N),me&&Ot.render(b),to(E,b,N)}j!==null&&H===0&&(K.updateMultisampleRenderTarget(j),K.updateRenderTargetMipmap(j)),z&&w.end(C),b.isScene===!0&&b.onAfterRender(C,b,N),_t.resetDefaultState(),X=-1,tt=null,x.pop(),x.length>0?(y=x[x.length-1],K.setTextureUnits(y.state.textureUnits),Zt===!0&&Rt.setGlobalState(C.clippingPlanes,y.state.camera)):y=null,R.pop(),R.length>0?E=R[R.length-1]:E=null,A!==null&&A.renderEnd()};function mr(b,N,W,z){if(b.visible===!1)return;if(b.layers.test(N.layers)){if(b.isGroup)W=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(N);else if(b.isLightProbeGrid)y.pushLightProbeGrid(b);else if(b.isLight)y.pushLight(b),b.castShadow&&y.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||b.intersectsFrustum(Vt)){z&&Pe.setFromMatrixPosition(b.matrixWorld).applyMatrix4(Xt);const Mt=Q.update(b),mt=b.material;mt.visible&&E.push(b,Mt,mt,W,Pe.z,null,N)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||b.intersectsFrustum(Vt))){const Mt=Q.update(b),mt=b.material;if(z&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),Pe.copy(b.boundingSphere.center)):(Mt.boundingSphere===null&&Mt.computeBoundingSphere(),Pe.copy(Mt.boundingSphere.center)),Pe.applyMatrix4(b.matrixWorld).applyMatrix4(Xt)),Array.isArray(mt)){const bt=Mt.groups;for(let At=0,Bt=bt.length;At<Bt;At++){const Wt=bt[At],Tt=mt[Wt.materialIndex];Tt&&Tt.visible&&E.push(b,Mt,Tt,W,Pe.z,Wt,N)}}else mt.visible&&E.push(b,Mt,mt,W,Pe.z,null,N)}}const gt=b.children;for(let Mt=0,mt=gt.length;Mt<mt;Mt++)mr(gt[Mt],N,W,z)}function to(b,N,W,z){const{opaque:G,transmissive:gt,transparent:Mt}=b;y.setupLightsView(W),Zt===!0&&Rt.setGlobalState(C.clippingPlanes,W),z&&M.viewport(et.copy(z)),G.length>0&&fs(G,N,W),gt.length>0&&fs(gt,N,W),Mt.length>0&&fs(Mt,N,W),M.buffers.depth.setTest(!0),M.buffers.depth.setMask(!0),M.buffers.color.setMask(!0),M.setPolygonOffset(!1)}function eo(b,N,W,z){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(y.state.transmissionRenderTarget[z.id]===void 0){const Tt=ie.has("EXT_color_buffer_half_float")||ie.has("EXT_color_buffer_float");y.state.transmissionRenderTarget[z.id]=new We(1,1,{generateMipmaps:!0,type:Tt?1016:1009,minFilter:1008,samples:Math.max(4,P.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:$t.workingColorSpace})}const gt=y.state.transmissionRenderTarget[z.id],Mt=z.viewport||et;gt.setSize(Mt.z*C.transmissionResolutionScale,Mt.w*C.transmissionResolutionScale);const mt=C.getRenderTarget(),bt=C.getActiveCubeFace(),At=C.getActiveMipmapLevel();C.setRenderTarget(gt),C.getClearColor(ne),kt=C.getClearAlpha(),kt<1&&C.setClearColor(16777215,.5),C.clear(),me&&Ot.render(W);const Bt=C.toneMapping;C.toneMapping=0;const Wt=z.viewport;if(z.viewport!==void 0&&(z.viewport=void 0),y.setupLightsView(z),Zt===!0&&Rt.setGlobalState(C.clippingPlanes,z),fs(b,W,z),K.updateMultisampleRenderTarget(gt),K.updateRenderTargetMipmap(gt),ie.has("WEBGL_multisampled_render_to_texture")===!1){let Tt=!1;for(let te=0,Se=N.length;te<Se;te++){const ue=N[te],{object:oe,geometry:Oe,material:vt,group:ze}=ue;if(vt.side===2&&oe.layers.test(z.layers)){const Kt=vt.side;vt.side=1,vt.needsUpdate=!0,no(oe,W,z,Oe,vt,ze),vt.side=Kt,vt.needsUpdate=!0,Tt=!0}}Tt===!0&&(K.updateMultisampleRenderTarget(gt),K.updateRenderTargetMipmap(gt))}C.setRenderTarget(mt,bt,At),C.setClearColor(ne,kt),Wt!==void 0&&(z.viewport=Wt),C.toneMapping=Bt}function fs(b,N,W){const z=N.isScene===!0?N.overrideMaterial:null;for(let G=0,gt=b.length;G<gt;G++){const Mt=b[G],{object:mt,geometry:bt,group:At}=Mt;let Bt=Mt.material;Bt.allowOverride===!0&&z!==null&&(Bt=z),mt.layers.test(W.layers)&&no(mt,N,W,bt,Bt,At)}}function no(b,N,W,z,G,gt){A!==null&&G.isNodeMaterial&&A.setObject(b,G),b.onBeforeRender(C,N,W,z,G,gt),b.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),G.onBeforeRender(C,N,W,z,b,gt),G.transparent===!0&&G.side===2&&G.forceSinglePass===!1?(G.side=1,G.needsUpdate=!0,C.renderBufferDirect(W,N,z,G,b,gt),G.side=0,G.needsUpdate=!0,C.renderBufferDirect(W,N,z,G,b,gt),G.side=2):C.renderBufferDirect(W,N,z,G,b,gt),b.onAfterRender(C,N,W,z,G,gt)}function ps(b,N,W){N.isScene!==!0&&(N=Xe);const z=V.get(b),G=y.state.lights,gt=y.state.shadowsArray,Mt=G.state.version,mt=ot.getParameters(b,G.state,gt,N,W,y.state.lightProbeGridArray),bt=ot.getProgramCacheKey(mt);let At=z.programs;z.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?N.environment:null,z.fog=N.fog;const Bt=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;z.envMap=rt.get(b.envMap||z.environment,Bt),z.envMapRotation=z.environment!==null&&b.envMap===null?N.environmentRotation:b.envMapRotation,At===void 0&&(b.addEventListener("dispose",dn),At=new Map,z.programs=At);let Wt=At.get(bt);if(Wt!==void 0){if(z.currentProgram===Wt&&z.lightsStateVersion===Mt)return so(b,mt),Wt}else mt.uniforms=ot.getUniforms(b),A!==null&&b.isNodeMaterial&&A.build(b,W,mt),b.onBeforeCompile(mt,C),Wt=ot.acquireProgram(mt,bt),At.set(bt,Wt),z.uniforms=mt.uniforms;const Tt=z.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Tt.clippingPlanes=Rt.uniform),so(b,mt),z.needsLights=th(b),z.lightsStateVersion=Mt,z.needsLights&&(Tt.ambientLightColor.value=G.state.ambient,Tt.lightProbe.value=G.state.probe,Tt.sunLights.value=G.state.sun,Tt.sunLightShadows.value=G.state.sunShadow,Tt.directionalLights.value=G.state.directional,Tt.directionalLightShadows.value=G.state.directionalShadow,Tt.spotLights.value=G.state.spot,Tt.spotLightShadows.value=G.state.spotShadow,Tt.rectAreaLights.value=G.state.rectArea,Tt.ltc_1.value=G.state.rectAreaLTC1,Tt.ltc_2.value=G.state.rectAreaLTC2,Tt.pointLights.value=G.state.point,Tt.pointLightShadows.value=G.state.pointShadow,Tt.hemisphereLights.value=G.state.hemi,Tt.sunShadowMatrix.value=G.state.sunShadowMatrix,Tt.sunShadowCascade.value=G.state.sunShadowCascade,Tt.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Tt.spotLightMatrix.value=G.state.spotLightMatrix,Tt.spotLightMap.value=G.state.spotLightMap,Tt.pointShadowMatrix.value=G.state.pointShadowMatrix),z.lightProbeGrid=y.state.lightProbeGridArray.length>0,z.currentProgram=Wt,z.uniformsList=null,Wt}function io(b){if(b.uniformsList===null){const N=b.currentProgram.getUniforms();b.uniformsList=$s.seqWithValue(N.seq,b.uniforms)}return b.uniformsList}function so(b,N){const W=V.get(b);W.outputColorSpace=N.outputColorSpace,W.batching=N.batching,W.batchingColor=N.batchingColor,W.instancing=N.instancing,W.instancingColor=N.instancingColor,W.instancingMorph=N.instancingMorph,W.skinning=N.skinning,W.morphTargets=N.morphTargets,W.morphNormals=N.morphNormals,W.morphColors=N.morphColors,W.morphTargetsCount=N.morphTargetsCount,W.numClippingPlanes=N.numClippingPlanes,W.numIntersection=N.numClipIntersection,W.vertexAlphas=N.vertexAlphas,W.vertexTangents=N.vertexTangents,W.toneMapping=N.toneMapping}function Zc(b,N){if(b.length===0)return null;if(b.length===1)return b[0].texture!==null?b[0]:null;S.setFromMatrixPosition(N.matrixWorld);for(let W=0,z=b.length;W<z;W++){const G=b[W];if(G.texture!==null&&G.boundingBox.containsPoint(S))return G}return null}function Qc(b,N,W,z,G){N.isScene!==!0&&(N=Xe),K.resetTextureUnits();const gt=N.fog,Mt=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?N.environment:null,mt=j===null?C.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:$t.workingColorSpace,bt=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap,At=rt.get(z.envMap||Mt,bt),Bt=z.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Wt=!!W.attributes.tangent&&(!!z.normalMap||z.anisotropy>0),Tt=!!W.morphAttributes.position,te=!!W.morphAttributes.normal,Se=!!W.morphAttributes.color;let ue=0;z.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(ue=C.toneMapping);const oe=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,Oe=oe!==void 0?oe.length:0,vt=V.get(z),ze=y.state.lights;if(Zt===!0&&(le===!0||b!==tt)){const he=b===tt&&z.id===X;Rt.setState(z,b,he)}let Kt=!1;z.version===vt.__version?(vt.needsLights&&vt.lightsStateVersion!==ze.state.version||vt.outputColorSpace!==mt||G.isBatchedMesh&&vt.batching===!1||!G.isBatchedMesh&&vt.batching===!0||G.isBatchedMesh&&vt.batchingColor===!0&&G._colorsTexture===null||G.isBatchedMesh&&vt.batchingColor===!1&&G._colorsTexture!==null||G.isInstancedMesh&&vt.instancing===!1||!G.isInstancedMesh&&vt.instancing===!0||G.isSkinnedMesh&&vt.skinning===!1||!G.isSkinnedMesh&&vt.skinning===!0||G.isInstancedMesh&&vt.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&vt.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&vt.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&vt.instancingMorph===!1&&G.morphTexture!==null||vt.envMap!==At||z.fog===!0&&vt.fog!==gt||vt.numClippingPlanes!==void 0&&(vt.numClippingPlanes!==Rt.numPlanes||vt.numIntersection!==Rt.numIntersection)||vt.vertexAlphas!==Bt||vt.vertexTangents!==Wt||vt.morphTargets!==Tt||vt.morphNormals!==te||vt.morphColors!==Se||vt.toneMapping!==ue||vt.morphTargetsCount!==Oe||!!vt.lightProbeGrid!=y.state.lightProbeGridArray.length>0)&&(Kt=!0):(Kt=!0,vt.__version=z.version);let Qe=vt.currentProgram;Kt===!0&&(Qe=ps(z,N,G),A&&z.isNodeMaterial&&A.onUpdateProgram(z,Qe,vt));let fn=!1,Un=!1,si=!1;const re=Qe.getUniforms(),_e=vt.uniforms;if(M.useProgram(Qe.program)&&(fn=!0,Un=!0,si=!0),z.id!==X&&(X=z.id,Un=!0),vt.needsLights){const he=Zc(y.state.lightProbeGridArray,G);vt.lightProbeGrid!==he&&(vt.lightProbeGrid=he,Un=!0)}if(fn||tt!==b){M.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),re.setValue(O,"projectionMatrix",b.projectionMatrix),re.setValue(O,"viewMatrix",b.matrixWorldInverse);const Fn=re.map.cameraPosition;Fn!==void 0&&Fn.setValue(O,de.setFromMatrixPosition(b.matrixWorld)),P.logarithmicDepthBuffer&&re.setValue(O,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(z.isMeshPhongMaterial||z.isMeshToonMaterial||z.isMeshLambertMaterial||z.isMeshBasicMaterial||z.isMeshStandardMaterial||z.isShaderMaterial)&&re.setValue(O,"isOrthographic",b.isOrthographicCamera===!0),tt!==b&&(tt=b,Un=!0,si=!0)}if(vt.needsLights&&(ze.state.sunShadowMap.length>0&&re.setValue(O,"sunShadowMap",ze.state.sunShadowMap,K),ze.state.directionalShadowMap.length>0&&re.setValue(O,"directionalShadowMap",ze.state.directionalShadowMap,K),ze.state.spotShadowMap.length>0&&re.setValue(O,"spotShadowMap",ze.state.spotShadowMap,K),ze.state.pointShadowMap.length>0&&re.setValue(O,"pointShadowMap",ze.state.pointShadowMap,K)),G.isSkinnedMesh){re.setOptional(O,G,"bindMatrix"),re.setOptional(O,G,"bindMatrixInverse");const he=G.skeleton;he&&(he.boneTexture===null&&he.computeBoneTexture(),re.setValue(O,"boneTexture",he.boneTexture,K))}G.isBatchedMesh&&(re.setOptional(O,G,"batchingTexture"),re.setValue(O,"batchingTexture",G._matricesTexture,K),re.setOptional(O,G,"batchingIdTexture"),re.setValue(O,"batchingIdTexture",G._indirectTexture,K),re.setOptional(O,G,"batchingColorTexture"),G._colorsTexture!==null&&re.setValue(O,"batchingColorTexture",G._colorsTexture,K));const Nn=W.morphAttributes;if((Nn.position!==void 0||Nn.normal!==void 0||Nn.color!==void 0)&&F.update(G,W,Qe),(Un||vt.receiveShadow!==G.receiveShadow)&&(vt.receiveShadow=G.receiveShadow,re.setValue(O,"receiveShadow",G.receiveShadow)),(z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial)&&z.envMap===null&&N.environment!==null&&(_e.envMapIntensity.value=N.environmentIntensity),_e.dfgLUT!==void 0&&(_e.dfgLUT.value=d0()),Un){if(re.setValue(O,"toneMappingExposure",C.toneMappingExposure),vt.needsLights&&jc(_e,si),gt&&z.fog===!0&&Ct.refreshFogUniforms(_e,gt),Ct.refreshMaterialUniforms(_e,z,it,Y,y.state.transmissionRenderTarget[b.id]),vt.needsLights&&vt.lightProbeGrid){const he=vt.lightProbeGrid;_e.probesSH.value=he.texture,_e.probesMin.value.copy(he.boundingBox.min),_e.probesMax.value.copy(he.boundingBox.max),_e.probesResolution.value.copy(he.resolution)}$s.upload(O,io(vt),_e,K)}if(z.isShaderMaterial&&z.uniformsNeedUpdate===!0&&($s.upload(O,io(vt),_e,K),z.uniformsNeedUpdate=!1),z.isSpriteMaterial&&re.setValue(O,"center",G.center),re.setValue(O,"modelViewMatrix",G.modelViewMatrix),re.setValue(O,"normalMatrix",G.normalMatrix),re.setValue(O,"modelMatrix",G.matrixWorld),z.uniformsGroups!==void 0){const he=z.uniformsGroups;for(let Fn=0,ri=he.length;Fn<ri;Fn++){const ao=he[Fn];st.update(ao,Qe),st.bind(ao,Qe)}}return Qe}function jc(b,N){b.ambientLightColor.needsUpdate=N,b.lightProbe.needsUpdate=N,b.sunLights.needsUpdate=N,b.sunLightShadows.needsUpdate=N,b.directionalLights.needsUpdate=N,b.directionalLightShadows.needsUpdate=N,b.pointLights.needsUpdate=N,b.pointLightShadows.needsUpdate=N,b.spotLights.needsUpdate=N,b.spotLightShadows.needsUpdate=N,b.rectAreaLights.needsUpdate=N,b.hemisphereLights.needsUpdate=N}function th(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return $},this.getActiveMipmapLevel=function(){return H},this.getRenderTarget=function(){return j},this.setRenderTargetTextures=function(b,N,W){const z=V.get(b);z.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,z.__autoAllocateDepthBuffer===!1&&(z.__useRenderToTexture=!1),V.get(b.texture).__webglTexture=N,V.get(b.depthTexture).__webglTexture=z.__autoAllocateDepthBuffer?void 0:W,z.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,N){const W=V.get(b);W.__webglFramebuffer=N,W.__useDefaultFramebuffer=N===void 0},this.setRenderTarget=function(b,N=0,W=0){j=b,$=N,H=W;let z=null,G=!1,gt=!1;if(b){const mt=V.get(b);if(mt.__useDefaultFramebuffer!==void 0){M.bindFramebuffer(O.FRAMEBUFFER,mt.__webglFramebuffer),et.copy(b.viewport),yt.copy(b.scissor),wt=b.scissorTest,M.viewport(et),M.scissor(yt),M.setScissorTest(wt),X=-1;return}else if(mt.__webglFramebuffer===void 0)K.setupRenderTarget(b);else if(mt.__hasExternalTextures)K.rebindTextures(b,V.get(b.texture).__webglTexture,V.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){const Bt=b.depthTexture;if(mt.__boundDepthTexture!==Bt){if(Bt!==null&&V.has(Bt)&&(b.width!==Bt.image.width||b.height!==Bt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");K.setupDepthRenderbuffer(b)}}const bt=b.texture;(bt.isData3DTexture||bt.isDataArrayTexture||bt.isCompressedArrayTexture)&&(gt=!0);const At=V.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(At[N])?z=At[N][W]:z=At[N],G=!0):b.samples>0&&K.useMultisampledRTT(b)===!1?z=V.get(b).__webglMultisampledFramebuffer:Array.isArray(At)?z=At[W]:z=At,et.copy(b.viewport),yt.copy(b.scissor),wt=b.scissorTest}else et.copy(xt).multiplyScalar(it).floor(),yt.copy(Gt).multiplyScalar(it).floor(),wt=Te;if(W!==0&&(z=U),M.bindFramebuffer(O.FRAMEBUFFER,z)&&M.drawBuffers(b,z),M.viewport(et),M.scissor(yt),M.setScissorTest(wt),G){const mt=V.get(b.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+N,mt.__webglTexture,W)}else if(gt){const mt=N;for(let bt=0;bt<b.textures.length;bt++){const At=V.get(b.textures[bt]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+bt,At.__webglTexture,W,mt)}}else if(b!==null&&W!==0){const mt=V.get(b.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,mt.__webglTexture,W)}X=-1};function ro(b){const N=V.get(b);return(N.__readFormat!==b.format||N.__readType!==b.type)&&(N.__readFormat=b.format,N.__readType=b.type,N.__formatReadable=P.textureFormatReadable(b.format),N.__typeReadable=P.textureTypeReadable(b.type)),N}this.readRenderTargetPixels=function(b,N,W,z,G,gt,Mt,mt=0){if(!(b&&b.isWebGLRenderTarget)){Yt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let bt=V.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Mt!==void 0&&(bt=bt[Mt]),bt){M.bindFramebuffer(O.FRAMEBUFFER,bt);try{const At=b.textures[mt],Bt=At.format,Wt=At.type;b.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+mt);const Tt=ro(At);if(Tt.__formatReadable===!1){Yt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Tt.__typeReadable===!1){Yt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}N>=0&&N<=b.width-z&&W>=0&&W<=b.height-G&&O.readPixels(N,W,z,G,ht.convert(Bt),ht.convert(Wt),gt)}finally{const At=j!==null?V.get(j).__webglFramebuffer:null;M.bindFramebuffer(O.FRAMEBUFFER,At)}}},this.readRenderTargetPixelsAsync=async function(b,N,W,z,G,gt,Mt,mt=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let bt=V.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Mt!==void 0&&(bt=bt[Mt]),bt)if(N>=0&&N<=b.width-z&&W>=0&&W<=b.height-G){M.bindFramebuffer(O.FRAMEBUFFER,bt);const At=b.textures[mt],Bt=At.format,Wt=At.type;b.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+mt);const Tt=ro(At);if(Tt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Tt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const te=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,te),O.bufferData(O.PIXEL_PACK_BUFFER,gt.byteLength,O.STREAM_READ),O.readPixels(N,W,z,G,ht.convert(Bt),ht.convert(Wt),0),O.bindBuffer(O.PIXEL_PACK_BUFFER,null);const Se=j!==null?V.get(j).__webglFramebuffer:null;M.bindFramebuffer(O.FRAMEBUFFER,Se);const ue=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await rh(O,ue,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,te),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,gt),O.bindBuffer(O.PIXEL_PACK_BUFFER,null),O.deleteBuffer(te),O.deleteSync(ue),gt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,N=null,W=0){const z=Math.pow(2,-W),G=Math.floor(b.image.width*z),gt=Math.floor(b.image.height*z),Mt=N!==null?N.x:0,mt=N!==null?N.y:0;K.setTexture2D(b,0),O.copyTexSubImage2D(O.TEXTURE_2D,W,0,0,Mt,mt,G,gt),M.unbindTexture()},this.copyTextureToTexture=function(b,N,W=null,z=null,G=0,gt=0){let Mt,mt,bt,At,Bt,Wt,Tt,te,Se;const ue=b.isCompressedTexture?b.mipmaps[gt]:b.image;if(W!==null)Mt=W.max.x-W.min.x,mt=W.max.y-W.min.y,bt=W.isBox3?W.max.z-W.min.z:1,At=W.min.x,Bt=W.min.y,Wt=W.isBox3?W.min.z:0;else{const _e=Math.pow(2,-G);Mt=Math.floor(ue.width*_e),mt=Math.floor(ue.height*_e),b.isDataArrayTexture?bt=ue.depth:b.isData3DTexture?bt=Math.floor(ue.depth*_e):bt=1,At=0,Bt=0,Wt=0}z!==null?(Tt=z.x,te=z.y,Se=z.z):(Tt=0,te=0,Se=0);const oe=ht.convert(N.format),Oe=ht.convert(N.type);let vt;N.isData3DTexture?(K.setTexture3D(N,0),vt=O.TEXTURE_3D):N.isDataArrayTexture||N.isCompressedArrayTexture?(K.setTexture2DArray(N,0),vt=O.TEXTURE_2D_ARRAY):(K.setTexture2D(N,0),vt=O.TEXTURE_2D),M.activeTexture(O.TEXTURE0),M.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,N.flipY),M.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,N.premultiplyAlpha),M.pixelStorei(O.UNPACK_ALIGNMENT,N.unpackAlignment);const ze=M.getParameter(O.UNPACK_ROW_LENGTH),Kt=M.getParameter(O.UNPACK_IMAGE_HEIGHT),Qe=M.getParameter(O.UNPACK_SKIP_PIXELS),fn=M.getParameter(O.UNPACK_SKIP_ROWS),Un=M.getParameter(O.UNPACK_SKIP_IMAGES);M.pixelStorei(O.UNPACK_ROW_LENGTH,ue.width),M.pixelStorei(O.UNPACK_IMAGE_HEIGHT,ue.height),M.pixelStorei(O.UNPACK_SKIP_PIXELS,At),M.pixelStorei(O.UNPACK_SKIP_ROWS,Bt),M.pixelStorei(O.UNPACK_SKIP_IMAGES,Wt);const si=b.isDataArrayTexture||b.isData3DTexture,re=N.isDataArrayTexture||N.isData3DTexture;if(b.isDepthTexture){const _e=V.get(b),Nn=V.get(N),he=V.get(_e.__renderTarget),Fn=V.get(Nn.__renderTarget);M.bindFramebuffer(O.READ_FRAMEBUFFER,he.__webglFramebuffer),M.bindFramebuffer(O.DRAW_FRAMEBUFFER,Fn.__webglFramebuffer);for(let ri=0;ri<bt;ri++)si&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,V.get(b).__webglTexture,G,Wt+ri),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,V.get(N).__webglTexture,gt,Se+ri)),O.blitFramebuffer(At,Bt,Mt,mt,Tt,te,Mt,mt,O.DEPTH_BUFFER_BIT,O.NEAREST);M.bindFramebuffer(O.READ_FRAMEBUFFER,null),M.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(G!==0||b.isRenderTargetTexture||V.has(b)){const _e=V.get(b),Nn=V.get(N);M.bindFramebuffer(O.READ_FRAMEBUFFER,L),M.bindFramebuffer(O.DRAW_FRAMEBUFFER,k);for(let he=0;he<bt;he++)si?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,_e.__webglTexture,G,Wt+he):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,_e.__webglTexture,G),re?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Nn.__webglTexture,gt,Se+he):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Nn.__webglTexture,gt),G!==0?O.blitFramebuffer(At,Bt,Mt,mt,Tt,te,Mt,mt,O.COLOR_BUFFER_BIT,O.NEAREST):re?O.copyTexSubImage3D(vt,gt,Tt,te,Se+he,At,Bt,Mt,mt):O.copyTexSubImage2D(vt,gt,Tt,te,At,Bt,Mt,mt);M.bindFramebuffer(O.READ_FRAMEBUFFER,null),M.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else re?b.isDataTexture||b.isData3DTexture?O.texSubImage3D(vt,gt,Tt,te,Se,Mt,mt,bt,oe,Oe,ue.data):N.isCompressedArrayTexture?O.compressedTexSubImage3D(vt,gt,Tt,te,Se,Mt,mt,bt,oe,ue.data):O.texSubImage3D(vt,gt,Tt,te,Se,Mt,mt,bt,oe,Oe,ue):b.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,gt,Tt,te,Mt,mt,oe,Oe,ue.data):b.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,gt,Tt,te,ue.width,ue.height,oe,ue.data):O.texSubImage2D(O.TEXTURE_2D,gt,Tt,te,Mt,mt,oe,Oe,ue);M.pixelStorei(O.UNPACK_ROW_LENGTH,ze),M.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Kt),M.pixelStorei(O.UNPACK_SKIP_PIXELS,Qe),M.pixelStorei(O.UNPACK_SKIP_ROWS,fn),M.pixelStorei(O.UNPACK_SKIP_IMAGES,Un),gt===0&&N.generateMipmaps&&O.generateMipmap(vt),M.unbindTexture()},this.initRenderTarget=function(b){V.get(b).__webglFramebuffer===void 0&&K.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?K.setTextureCube(b,0):b.isData3DTexture?K.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?K.setTexture2DArray(b,0):K.setTexture2D(b,0),M.unbindTexture()},this.resetState=function(){$=0,H=0,j=null,M.reset(),_t.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return 2e3}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=$t._getDrawingBufferColorSpace(t),e.unpackColorSpace=$t._getUnpackColorSpace()}}const qs={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class ki{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const f0=new cr(-1,1,1,-1,0,1);class p0 extends De{constructor(){super(),this.setAttribute("position",new Qt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Qt([0,2,0,0,2,0],2))}}const m0=new p0;class Fa{constructor(t){this._mesh=new pt(m0,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,f0)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}}class g0 extends ki{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof Ae?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=ss.clone(t.uniforms),this.material=new Ae({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new Fa(this.material)}render(t,e,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class pl extends ki{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,n){const s=t.getContext(),r=t.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,a,4294967295),r.buffers.stencil.setClear(o),r.buffers.stencil.setLocked(!0),t.setRenderTarget(n),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class _0 extends ki{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}}class t_{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){const n=t.getSize(new ut);this._width=n.width,this._height=n.height,e=new We(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:1016}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new g0(qs),this.copyPass.material.blending=0,this.timer=new fu}swapBuffers(){const t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){const e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){this.timer.update(),t===void 0&&(t=this.timer.getDelta());const e=this.renderer.getRenderTarget();let n=!1;for(let s=0,r=this.passes.length;s<r;s++){const a=this.passes[s];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),a.render(this.renderer,this.writeBuffer,this.readBuffer,t,n),a.needsSwap){if(n){const o=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),l.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}pl!==void 0&&(a instanceof pl?n=!0:a instanceof _0&&(n=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){const e=this.renderer.getSize(new ut);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;const n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class e_ extends ki{constructor(t,e,n=null,s=null,r=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new It}render(t,e,n){const s=t.autoClear;t.autoClear=!1;let r,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(r=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),t.autoClear=s}}const v0={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new It(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class rs extends ki{constructor(t,e=1,n,s){super(),this.strength=e,this.radius=n,this.threshold=s,this.resolution=t!==void 0?new ut(t.x,t.y):new ut(256,256),this.clearColor=new It(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new We(r,a,{type:1016,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const u=new We(r,a,{type:1016,depthBuffer:!1});u.texture.name="UnrealBloomPass.h"+h,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);const d=new We(r,a,{type:1016,depthBuffer:!1});d.texture.name="UnrealBloomPass.v"+h,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),r=Math.round(r/2),a=Math.round(a/2)}const o=v0;this.highPassUniforms=ss.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Ae({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];const l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new ut(1/r,1/a),r=Math.round(r/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=ss.clone(qs.uniforms),this.blendMaterial=new Ae({uniforms:this.copyUniforms,vertexShader:qs.vertexShader,fragmentShader:qs.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new It,this._oldClearAlpha=1,this._basic=new qe,this._fsQuad=new Fa(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let n=Math.round(t/2),s=Math.round(e/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new ut(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(t,e,n,s,r){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();const a=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),r&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let o=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[l].uniforms.direction.value=rs.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[l]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=rs.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[l]),t.clear(),this._fsQuad.render(t),o=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=a}_getSeparableBlurMaterial(t){const e=[],n=t/3;for(let a=0;a<t;a++)e.push(.39894*Math.exp(-.5*a*a/(n*n))/n);const s=[],r=[];for(let a=1;a<t;a+=2){const o=e[a],l=a+1<t?e[a+1]:0,c=o+l;s.push((a*o+(a+1)*l)/c),r.push(c)}return new Ae({defines:{KERNEL_PAIRS:s.length},uniforms:{colorTexture:{value:null},invSize:{value:new ut(.5,.5)},direction:{value:new ut(.5,.5)},centerWeight:{value:e[0]},gaussianOffsets:{value:s},gaussianWeights:{value:r}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(t){return new Ae({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}}rs.BlurDirectionX=new ut(1,0);rs.BlurDirectionY=new ut(0,1);const Hs={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class n_ extends ki{constructor(){super(),this.isOutputPass=!0,this.uniforms=ss.clone(Hs.uniforms),this.material=new lc({name:Hs.name,uniforms:this.uniforms,vertexShader:Hs.vertexShader,fragmentShader:Hs.fragmentShader}),this._fsQuad=new Fa(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},$t.getTransfer(this._outputColorSpace)===ee&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class i_ extends Sh{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;const t=new fe;t.deleteAttribute("uv");const e=new Je({side:1}),n=new Je,s=new cu(16777215,900,28,2);s.position.set(.418,16.199,.3),this.add(s);const r=new pt(t,e);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);const a=new Dh(t,n,6),o=new xe;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),a.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),a.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),a.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),a.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),a.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),a.setMatrixAt(5,o.matrix),this.add(a);const l=new pt(t,Ei(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);const c=new pt(t,Ei(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);const h=new pt(t,Ei(17));h.position.set(14.904,12.198,-1.832),h.scale.set(.15,4.265,6.331),this.add(h);const u=new pt(t,Ei(43));u.position.set(-.462,8.89,14.52),u.scale.set(4.38,5.441,.088),this.add(u);const d=new pt(t,Ei(20));d.position.set(3.235,11.486,-12.541),d.scale.set(2.5,2,.1),this.add(d);const p=new pt(t,Ei(100));p.position.set(0,20,0),p.scale.set(1,.1,1),this.add(p)}dispose(){const t=new Set;this.traverse(e=>{e.isMesh&&(t.add(e.geometry),t.add(e.material))});for(const e of t)e.dispose()}}function Ei(i){return new eu({color:0,emissive:16777215,emissiveIntensity:i})}const as=typeof location<"u"&&new URLSearchParams(location.search).get("style")==="classic"?"classic":"neo",xc=as==="neo",en=xc?{fog:725542,trace:4025343,glass:11131135,copper:12166012,silver:12897494,hp:4063142,incoming:16754219,hud:15398655,side:{b:3135743,r:16732010}}:{fog:204828,trace:2086580,glass:8386015,copper:13214826,silver:13621462,hp:4063142,incoming:16754219,hud:15335419,side:{b:3135743,r:16734830}},Zr={hp:"#3dffa6",hpLow:"#ffb238",side:xc?{b:"#2fd8ff",r:"#ff4f6a"}:{b:"#2fd8ff",r:"#ff5a6e"}},$n='"Chakra Petch", "JetBrains Mono", monospace',os='"Noto Sans SC", "PingFang SC", sans-serif';function ua(i){let t=i>>>0;return()=>(t=t*1664525+1013904223>>>0,t/4294967296)}function Ii(i,t){const e=document.createElement("canvas");return e.width=i,e.height=t,[e,e.getContext("2d")]}function Ui(i,t=!0){const e=new ds(i);return t&&(e.colorSpace=Ue),e.anisotropy=8,e}function da(i,t,e,n,s,r,a){const o=ua(s),l=Math.max(8,Math.round(a*4));i.strokeStyle=r,i.fillStyle=r,i.lineCap="round",i.lineJoin="round";for(let c=0;c<n;c++){let h=Math.round(o()*t/l)*l,u=Math.round(o()*e/l)*l;i.lineWidth=a*(o()<.2?2:1),i.beginPath(),i.moveTo(h,u);const d=2+Math.floor(o()*4);let p=Math.floor(o()*4);for(let g=0;g<d;g++){const _=(2+Math.floor(o()*10))*l,m=o()<.35,f=[1,0,-1,0][p],v=[0,1,0,-1][p];m?(h+=(f||(o()<.5?1:-1))*_*.5,u+=(v||(o()<.5?1:-1))*_*.5):(h+=f*_,u+=v*_),i.lineTo(h,u),p=(p+(o()<.5?1:3))%4}i.stroke(),i.beginPath(),i.arc(h,u,a*1.8,0,Math.PI*2),i.fill()}}function x0(){const[t,e]=Ii(2048,2048);e.fillStyle="#04211d",e.fillRect(0,0,2048,2048),e.strokeStyle="rgba(31,214,180,0.05)",e.lineWidth=1;for(let c=0;c<2048;c+=32)e.beginPath(),e.moveTo(c,0),e.lineTo(c,2048),e.stroke(),e.beginPath(),e.moveTo(0,c),e.lineTo(2048,c),e.stroke();da(e,2048,2048,260,7,"#0b4a40",3);const n=ua(3);for(let c=0;c<18;c++){const h=n()*2048,u=n()*2048,d=6+Math.floor(n()*10);e.fillStyle="#0a3a33",e.fillRect(h-8,u-8,d*14+16,d*14+16),e.fillStyle="#6b5a3a";for(let p=0;p<d;p++)e.fillRect(h+p*14,u-18,6,12),e.fillRect(h+p*14,u+d*14+6,6,12)}const[s,r]=Ii(2048,2048);r.fillStyle="#000",r.fillRect(0,0,2048,2048),da(r,2048,2048,70,11,"#1fd6b4",2.5);const a=ua(19);r.fillStyle="#7ff5df";for(let c=0;c<400;c++)r.beginPath(),r.arc(a()*2048,a()*2048,2.5,0,Math.PI*2),r.fill();const o=Ui(t),l=Ui(s);for(const c of[o,l])c.wrapS=c.wrapT=1e3,c.repeat.set(8,8);return[o,l]}function M0(i,t){const[e,n]=Ii(512,768);da(n,512,768,46,i,"#ffffff",2.2),t&&n.clearRect(...t),n.strokeStyle="#ffffff",n.lineWidth=3,n.strokeRect(14,14,484,740);for(const[s,r]of[[30,30],[482,30],[30,738],[482,738]])n.beginPath(),n.arc(s,r,9,0,Math.PI*2),n.stroke();return Ui(e,!1)}function S0(i,t,e,n,s){const[o,l]=Ii(512,128);l.fillStyle="#021612",l.fillRect(0,0,512,128),l.fillStyle="rgba(127,245,223,0.05)";for(let f=0;f<128;f+=3)l.fillRect(0,f,512,1);const c=Zr.side[t];l.fillStyle=c,l.beginPath();const h=54,u=64,d=40;for(let f=0;f<6;f++){const v=Math.PI/6+f*Math.PI/3;l.lineTo(h+d*Math.cos(v),u+d*Math.sin(v))}l.fill(),l.fillStyle="#021612",l.font=`700 40px ${os}`,l.textAlign="center",l.textBaseline="middle",l.fillText(i.slice(1),h,u+2),l.textAlign="left",l.fillStyle="#e9fffb",l.font=`700 38px ${os}`,l.fillText(i,108,64);const p=e-s,_=e/n<=.45?Zr.hpLow:Zr.hp;l.textAlign="right",l.font=`700 64px ${$n}`,l.fillStyle=_,l.shadowColor=_,l.shadowBlur=16;const m=String(e);return l.fillText(m,420,70),l.shadowBlur=0,l.font=`500 28px ${$n}`,l.fillStyle="#6fa59a",l.textAlign="left",l.fillText("/"+n,426,80),s&&(l.textAlign="right",l.font=`700 22px ${$n}`,l.fillStyle=p<=0?"#ffd24a":"#e9fffb",l.fillText(p<=0?"✕ KO":`−${s}→${p}`,500,24)),Ui(o)}function y0(i,t){const[e,n]=Ii(256,64);return n.fillStyle=t?"#ffd24a":"rgba(2,22,18,0.85)",n.beginPath(),n.moveTo(12,0),n.lineTo(256,0),n.lineTo(244,64),n.lineTo(0,64),n.closePath(),n.fill(),t||(n.strokeStyle="#e9fffb",n.lineWidth=2,n.stroke()),n.fillStyle=t?"#081210":"#e9fffb",n.font=`700 34px ${$n}, ${os}`,n.textAlign="center",n.textBaseline="middle",n.fillText(i,128,34),Ui(e)}function b0(){const[e,n]=Ii(2048,128),s=n.createLinearGradient(0,0,0,128);s.addColorStop(0,"rgba(31,214,180,0)"),s.addColorStop(.5,"rgba(31,214,180,0.22)"),s.addColorStop(1,"rgba(31,214,180,0)"),n.fillStyle=s,n.fillRect(0,0,2048,128),n.fillStyle="#7ff5df",n.font=`500 30px ${$n}`,n.textAlign="center";for(let r=0;r<=20;r++){const a=40+r/20*1968,o=r%5===0;n.fillRect(a-1,o?34:48,2,o?60:32),o&&n.fillText(r+(r===20?"s":""),a,26)}return n.fillRect(40,62,1968,4),Ui(e)}class s_{constructor(t,e=0){q(this,"root",new ge);q(this,"pcbMat");q(this,"markers",[]);q(this,"width",11.5);const[n,s]=x0();this.pcbMat=new Je({map:n,emissiveMap:s,emissive:new It(en.trace),emissiveIntensity:.6,roughness:.55,metalness:.35});const r=new pt(new Ln(80,80),this.pcbMat);if(r.rotation.x=-Math.PI/2,this.root.add(r),!t.length)return;const a=new pt(new Ln(this.width,this.width/16),new qe({map:b0(),transparent:!0,depthWrite:!1,blending:2,toneMapped:!1}));a.rotation.x=-Math.PI/2,a.position.set(0,.03,e),this.root.add(a);for(const o of t){const l=new ge,c=en.side[o.side],h=new pt(new La(.11),new qe({color:c,toneMapped:!1}));h.position.y=.42;const u=new pt(new be(.012,.012,.4,6),new qe({color:c,transparent:!0,opacity:.6,toneMapped:!1}));u.position.y=.2,l.add(h,u),l.position.set(this.secX(o.sec),0,e+(o.side==="r"?-.12:.12)),this.root.add(l),this.markers.push(l)}}secX(t){const e=this.width*.9609375;return-e/2+t/20*e}update(t){this.pcbMat.emissiveIntensity=.45+.2*Math.sin(t*.8),this.markers.forEach((e,n)=>{e.children[0].rotation.y=t*1.5+n,e.children[0].position.y=.42+Math.sin(t*2+n)*.04})}}const Zi=new D;function tn(i,t,e,n,s,r){const a=2*Math.PI*s/4,o=Math.max(r-2*s,0),l=Math.PI/4;Zi.copy(t),Zi[n]=0,Zi.normalize();const c=.5*a/(a+o),h=1-Zi.angleTo(i)/l;return Math.sign(Zi[e])===1?h*c:o/(a+o)+c+c*(1-h)}class Sn extends fe{constructor(t=1,e=1,n=1,s=2,r=.1){const a=s*2+1;if(r=Math.min(t/2,e/2,n/2,r),super(1,1,1,a,a,a),this.type="RoundedBoxGeometry",this.parameters={width:t,height:e,depth:n,segments:s,radius:r},a===1)return;const o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;const l=new D,c=new D,h=new D(t,e,n).divideScalar(2).subScalar(r),u=this.attributes.position.array,d=this.attributes.normal.array,p=this.attributes.uv.array,g=u.length/6,_=new D,m=.5/a;for(let f=0,v=0;f<u.length;f+=3,v+=2)switch(l.fromArray(u,f),c.copy(l),c.x-=Math.sign(c.x)*m,c.y-=Math.sign(c.y)*m,c.z-=Math.sign(c.z)*m,c.normalize(),u[f+0]=h.x*Math.sign(l.x)+c.x*r,u[f+1]=h.y*Math.sign(l.y)+c.y*r,u[f+2]=h.z*Math.sign(l.z)+c.z*r,d[f+0]=c.x,d[f+1]=c.y,d[f+2]=c.z,Math.floor(f/g)){case 0:_.set(1,0,0),p[v+0]=tn(_,c,"z","y",r,n),p[v+1]=1-tn(_,c,"y","z",r,e);break;case 1:_.set(-1,0,0),p[v+0]=1-tn(_,c,"z","y",r,n),p[v+1]=1-tn(_,c,"y","z",r,e);break;case 2:_.set(0,1,0),p[v+0]=1-tn(_,c,"x","z",r,t),p[v+1]=tn(_,c,"z","x",r,n);break;case 3:_.set(0,-1,0),p[v+0]=1-tn(_,c,"x","z",r,t),p[v+1]=1-tn(_,c,"z","x",r,n);break;case 4:_.set(0,0,1),p[v+0]=1-tn(_,c,"x","y",r,t),p[v+1]=1-tn(_,c,"y","x",r,e);break;case 5:_.set(0,0,-1),p[v+0]=tn(_,c,"x","y",r,t),p[v+1]=1-tn(_,c,"y","x",r,e);break}}static fromJSON(t){return new Sn(t.width,t.height,t.depth,t.segments,t.radius)}}function Oa(i){let t=i>>>0;return()=>(t=t*1664525+1013904223>>>0,t/4294967296)}function Mc(i,t){const e=document.createElement("canvas");return e.width=i,e.height=t,[e,e.getContext("2d")]}function Qr(i,t=1,e=[2,3]){const[s,r]=Mc(512,512),a=Oa(t),o=i==="steel"?[150,160,174]:[58,66,82];r.fillStyle=`rgb(${o[0]},${o[1]},${o[2]})`,r.fillRect(0,0,512,512);for(let u=0;u<2600;u++){const d=a()*512,p=40+a()*260,g=a()*512,_=a()<.5?255:0;r.fillStyle=`rgba(${_},${_},${_},${.02+a()*.05})`,r.fillRect(g,d,p,1)}const[l,c]=e;r.strokeStyle="rgba(6,10,20,0.85)",r.lineWidth=3;for(let u=0;u<=l;u++){const d=u/l*512;r.beginPath(),r.moveTo(d,0),r.lineTo(d,512),r.stroke()}for(let u=0;u<=c;u++){const d=u/c*512;r.beginPath(),r.moveTo(0,d),r.lineTo(512,d),r.stroke()}r.strokeStyle="rgba(255,255,255,0.12)",r.lineWidth=1;for(let u=0;u<l;u++)for(let d=0;d<c;d++){r.strokeRect(u/l*512+6,d/c*512+6,512/l-12,512/c-12);for(const[p,g]of[[12,12],[512/l-12,12],[12,512/c-12],[512/l-12,512/c-12]])r.fillStyle="rgba(10,14,24,0.7)",r.beginPath(),r.arc(u/l*512+p,d/c*512+g,3.2,0,Math.PI*2),r.fill(),r.fillStyle="rgba(255,255,255,0.25)",r.beginPath(),r.arc(u/l*512+p-.8,d/c*512+g-.8,1.2,0,Math.PI*2),r.fill()}for(let u=0;u<40;u++)r.fillStyle=`rgba(255,255,255,${.04+a()*.06})`,r.fillRect(a()*512,a()*512,10+a()*50,1);const h=new ds(s);return h.colorSpace=Ue,h.wrapS=h.wrapT=1e3,h.anisotropy=8,h}function T0(i,t){const[s,r]=Mc(512,768),a=Oa(i);r.strokeStyle="#fff",r.fillStyle="#fff",r.lineWidth=3;const o=16,l=34;r.beginPath(),r.moveTo(o+l,o),r.lineTo(512-o,o),r.lineTo(512-o,768-o-l),r.lineTo(512-o-l,768-o),r.lineTo(o,768-o),r.lineTo(o,o+l),r.closePath(),r.stroke(),r.lineWidth=2;for(let h=0;h<28;h++){const u=40+h*16,d=h%4===0?14:7;r.beginPath(),r.moveTo(u,o+6),r.lineTo(u,o+6+d),r.stroke()}for(let h=0;h<38;h++){const u=60+h*17.513513513513512,d=h%5===0?14:7;r.beginPath(),r.moveTo(o+6,u),r.lineTo(o+6+d,u),r.stroke(),r.beginPath(),r.moveTo(512-o-6,u),r.lineTo(512-o-6-d,u),r.stroke()}for(let h=0;h<9;h++){const u=60+a()*392,d=60+a()*648;r.beginPath(),r.moveTo(u-6,d),r.lineTo(u+6,d),r.moveTo(u,d-6),r.lineTo(u,d+6),r.stroke()}t&&r.clearRect(...t);const c=new ds(s);return c.anisotropy=8,c}function E0(i,t,e,n){const s=Sc(),r=new ge,a=new pt(new Sn(i-.3,e-.04,t-.3,2,.03),s.dark);a.position.y=(e-.04)/2+.02,r.add(a);const o=new pt(new fe(i-.22,.02,t-.22),new qe({color:n,toneMapped:!1}));o.position.y=e*.55,r.add(o);for(const l of[-1,1])for(const c of[-1,1]){const h=new pt(new be(.1,.13,e+.02,10),s.steel);h.position.set(l*(i/2-.2),(e+.02)/2,c*(t/2-.2)),r.add(h);const u=new pt(new be(.16,.18,.03,10),s.chrome);u.position.set(l*(i/2-.2),.015,c*(t/2-.2)),r.add(u)}return r}const Sc=(()=>{let i=null;function t(){const e=new Je({map:Qr("steel",3,[3,2]),metalness:.9,roughness:.38,color:14673646}),n=new Je({map:Qr("paint",5,[2,3]),metalness:.55,roughness:.62}),s=new Je({color:1053983,metalness:.7,roughness:.5}),r=new Je({color:15265526,metalness:1,roughness:.18}),a=new Je({color:724502,metalness:.1,roughness:.8}),o=new Je({color:12166012,metalness:1,roughness:.3}),l=n.clone();return l.map=Qr("paint",11,[2,2]),{steel:e,paint:n,dark:s,chrome:r,rubber:a,copper:o,slab:l}}return()=>i??(i=t())})();function fa(i,t,e,n){const s=i.distanceTo(t),r=new pt(new be(e,e,s,14),n);return r.position.copy(i).lerp(t,.5),r.quaternion.setFromUnitVectors(new D(0,1,0),t.clone().sub(i).normalize()),r}function ml(i,t,e){const n=new ge,s=i.clone().lerp(t,.55);n.add(fa(i,s,.045,e.dark)),n.add(fa(s,t,.02,e.chrome));for(const r of[.15,.7]){const a=i.clone().lerp(s,r),o=new pt(new be(.056,.056,.02,14),e.steel);o.position.copy(a),o.quaternion.setFromUnitVectors(new D(0,1,0),t.clone().sub(i).normalize()),n.add(o)}for(const r of[i,t]){const a=new pt(new or(.05,12,8),e.steel);a.position.copy(r),n.add(a)}return n}function jr(i,t,e=.016){const n=new ge;n.add(new pt(new Ia(new rc(i),24,e,6,!1),t.rubber));for(const[s,r]of[[i[0],i[1]],[i[i.length-1],i[i.length-2]]]){const a=fa(s,s.clone().lerp(r,.08),e*1.9,t.copper);n.add(a)}return n}function w0(i,t,e,n,s,r){const a=Sc(),o=new ge,l=Oa(r*97+5),c=[],h=C=>{const I=new qe({color:C,toneMapped:!1});return I.userData.base=C,c.push(I),I},u=new pt(new Sn(i,e,t,2,.02),a.slab);u.position.y=e/2,o.add(u);const d=new pt(new Sn(i+.1,.05,t+.1,2,.02),a.steel);d.position.y=.025,o.add(d);const p=new qe({color:s,toneMapped:!1});for(const C of[-1,1]){const I=new pt(new Sn(.1,.075,t-.28,2,.015),a.steel);I.position.set(C*(i/2-.08),e+.03,-.02),o.add(I);const A=new pt(new fe(.018,.008,t-.7),p);A.position.set(C*(i/2-.08),e+.07,-.02),o.add(A)}for(const C of[-1,1]){const I=new pt(new Sn(.2,.2,t*.5,2,.03),a.paint);I.position.set(C*(i/2+.06),e/2+.02,.1),o.add(I);for(let L=0;L<6;L++){const k=new pt(new fe(.06,.15,.025),a.steel);k.position.set(C*(i/2+.18),e/2+.03,-.25+L*.1+.12),o.add(k)}const A=new pt(new be(.07,.07,.1,12),a.dark);A.rotation.z=Math.PI/2,A.position.set(C*(i/2+.17),e/2+.1,.55),o.add(A);const U=new pt(new fe(.02,.03,t*.4),p);U.position.set(C*(i/2+.165),e/2+.1,.1),o.add(U)}const g=t/2-.085;for(let C=0;C<9;C++){const I=-.96+C*.24,A=new pt(new fe(.17,.012,.07),a.dark);A.position.set(I,e+.006,g),o.add(A);const U=new pt(new fe(.03,.01,.014),h(C%4===1?16757575:9416959));U.position.set(I+.04,e+.012,g+.028),o.add(U);const L=new pt(new be(.016,.016,.01,6),a.chrome);L.position.set(I-.095,e+.006,g-.05),o.add(L)}const _=(n+i)/4,m=new ge,f=new pt(new or(.1,20,14),a.steel);f.position.y=.12;const v=new pt(new Da(.125,.018,8,24),a.dark);v.position.y=.12,v.rotation.x=Math.PI/2.3;const T=new pt(new be(.12,.14,.07,18),a.paint);T.position.y=.035,m.add(T,f,v),m.position.set(-_,e,-.52),o.add(m),o.add(ml(new D(-_-.04,e+.04,-.15),new D(-_-.02,e+.26,-.5),a)),o.add(ml(new D(-_+.04,e+.04,-.88),new D(-_,e+.25,-.58),a)),o.add(jr([new D(-_+.08,e+.15,-.5),new D(-_+.2,e+.12,-.2),new D(-_+.02,e+.07,.25),new D(-_+.18,e+.03,g-.06)],a)),o.add(jr([new D(-_-.1,e+.14,-.55),new D(-_-.12,e+.1,-.15),new D(-_-.05,e+.05,.4),new D(-_-.04,e+.03,.7)],a,.012));const S=new pt(new Sn(.22,.2,.34,2,.02),a.paint);S.position.set(_,e+.1,-.62),o.add(S);const E=new pt(new fe(.2,.014,.02),h(9416959));E.position.set(_,e+.16,-.45),o.add(E);const y=new pt(new fe(.2,.014,.02),h(9416959));y.position.set(_,e+.12,-.45),o.add(y);for(let C=0;C<5;C++){const I=new pt(new fe(.2,.012,.014),a.dark);I.position.set(_,e+.05+C*.03,-.79),o.add(I)}const R=new pt(new be(.05,.05,.22,16),a.dark);R.position.set(_,e+.11,-.2);const x=new pt(new be(.022,.022,.1,12),a.chrome);x.position.set(_,e+.27,-.2),o.add(R,x);for(const C of[.04,.17]){const I=new pt(new be(.058,.058,.02,16),a.steel);I.position.set(_,e+C,-.2),o.add(I)}o.add(jr([new D(_-.05,e+.22,-.2),new D(_-.16,e+.14,.1),new D(_-.02,e+.06,.38),new D(_-.12,e+.03,g-.06)],a));const w=new pt(new be(.03,.03,i-.5,10),a.chrome);w.rotation.z=Math.PI/2,w.position.set(0,e+.03,-t/2+.07),o.add(w);for(let C=0;C<5;C++){const I=new pt(new fe(.05,.01,.02),h(l()<.3?16757575:9416959));I.position.set(-.5+C*.25,e+.012,-t/2+.16),o.add(I)}for(const C of[-1,1])for(const I of[-1,1]){const A=new pt(new be(.035,.035,.02,6),a.chrome);A.position.set(C*(i/2-.04),e+.01,I*(t/2-.04)),o.add(A)}return{group:o,lights:c,update(C){c.forEach((I,A)=>I.color.setHex(I.userData.base).multiplyScalar(.65+.35*Math.sin(C*(1.5+A%3*.7)+A*1.9)))}}}const yc=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,A0=`
uniform sampler2D map;
uniform float uTime;
uniform float uGlitch;     // 0..1 受击时的瞬时撕裂强度
uniform float uDistort;    // 常驻失真强度（滑块）
uniform float uMix;        // 0 = 原色，1 = 全绿荧光
uniform float uOpacity;
uniform float uSeed;
uniform vec3 uTint;
uniform vec4 uRect;      // 取图范围：xy 偏移，zw 缩放
uniform float uFade;     // 底部渐隐的高度
varying vec2 vUv;

float h1(float n) { return fract(sin(n) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float t = uTime + uSeed * 17.0;
  vec2 uv = uRect.xy + vUv * uRect.zw;

  // 偶发的自然故障：每 1/8 秒掷一次骰子
  float natural = step(0.988, h1(floor(t * 8.0) + uSeed)) * 0.5;
  float burst = clamp(uGlitch + natural * uDistort, 0.0, 1.5);

  // 横向撕裂：把画面切成横条，部分条带左右错位
  float band = floor(vUv.y * 46.0);
  float pick = step(0.55, h1(band * 1.37 + floor(t * 14.0)));
  uv.x += (h1(band + floor(t * 30.0)) - 0.5) * 0.11 * burst * pick;
  // 常驻的轻微波纹
  uv.x += sin(uv.y * 38.0 + t * 2.6) * 0.0018 * uDistort;

  // 色散：红蓝通道左右分离
  float ca = (0.003 + 0.022 * burst) * uDistort;
  vec4 cR = texture2D(map, uv + vec2(ca, 0.0));
  vec4 cG = texture2D(map, uv);
  vec4 cB = texture2D(map, uv - vec2(ca, 0.0));
  vec3 col = vec3(cR.r, cG.g, cB.b);
  float a = max(cG.a, max(cR.a, cB.a) * 0.75);

  // 绿色荧光：保留原色，只把暗部和中间调往荧光绿推一点
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 phos = uTint * (0.04 + pow(lum, 1.25) * 1.75);
  col = mix(col, phos, uMix) + uTint * 0.05 * uMix;

  // 扫描线 + 像素栅格
  float scan = 0.82 + 0.18 * sin(vUv.y * 900.0);
  float grid = 0.94 + 0.06 * sin(vUv.x * 600.0);
  col *= mix(1.0, scan * grid, uDistort);

  // 自上而下滚动的亮带
  float roll = 1.0 - smoothstep(0.0, 0.05, abs(fract(vUv.y + t * 0.11) - 0.5));
  col += uTint * 0.12 * roll * uDistort;

  // 数字噪点与闪烁
  col += (h2(vUv * vec2(640.0, 960.0) + fract(t * 7.0)) - 0.5) * 0.06 * uDistort;
  col *= 1.0 - 0.06 * uDistort * (0.5 + 0.5 * sin(t * 57.0));

  // 受击时随机掉块（整块像素丢失）
  vec2 blk = floor(vUv * vec2(10.0, 18.0));
  float drop = step(1.0 - 0.18 * uGlitch, h2(blk + floor(t * 20.0)));
  a *= 1.0 - drop * 0.85;

  // 底部渐隐，像从底座投出来的影像；抠图边缘残留的淡 alpha 直接丢掉
  a *= smoothstep(0.0, uFade, vUv.y);
  if (a < 0.06) discard;
  gl_FragColor = vec4(col, a * uOpacity);
}`;function C0(i,t){return new Ae({uniforms:{map:{value:i},uTime:{value:0},uGlitch:{value:0},uDistort:{value:.4},uMix:{value:.15},uOpacity:{value:1},uSeed:{value:t},uTint:{value:new It(3800988)},uRect:{value:new pe(0,0,1,1)},uFade:{value:.14}},vertexShader:yc,fragmentShader:A0,transparent:!0,depthWrite:!1,toneMapped:!1})}const R0=`
uniform sampler2D mask;
uniform float uTime;
uniform float uBase;
uniform float uPulse;
uniform vec3 uColor;
varying vec2 vUv;
float h2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float m = texture2D(mask, vUv).a;
  // 两道沿竖直方向流动的电流
  float f1 = 1.0 - smoothstep(0.0, 0.07, abs(fract(vUv.y - uTime * 0.23) - 0.5));
  float f2 = 1.0 - smoothstep(0.0, 0.04, abs(fract(vUv.y * 1.7 + vUv.x * 0.6 + uTime * 0.17) - 0.5));
  float spark = step(0.995, h2(floor(vUv * 80.0) + floor(uTime * 6.0)));
  float k = uBase + uPulse * (f1 + 0.6 * f2) + spark;
  gl_FragColor = vec4(uColor * k, m * clamp(k, 0.0, 1.0));
}`;function P0(i,t,e,n){return new Ae({uniforms:{mask:{value:i},uTime:{value:0},uBase:{value:e},uPulse:{value:n},uColor:{value:new It(t)}},vertexShader:yc,fragmentShader:R0,transparent:!0,depthWrite:!1,blending:2,toneMapped:!1})}const L0={atk:0,block:0,heal:0,redirect:!1,delay:0,blood:0,bloodRoom:7,conts:0,contLeft:0,clauses:[],statuses:[]},D0={易伤:"#ff5d73",灼烧:"#ffa23a",衰弱:"#b58cff"},I0={atk:"#ff7a5c",heal:"#5dffb0",mit:"#5cc8ff",st:"#ff5dc8",redirect:"#ffd24a",delay:"#cfa37f",remove:"#e9fffb"},U0={atk:"伤",heal:"疗",mit:"挡",st:"状",redirect:"移",delay:"延",remove:"除"},gl=new Map;function yn(i,t,e,n){let s=gl.get(i);if(!s){const r=document.createElement("canvas");r.width=t,r.height=e,n(r.getContext("2d")),s=new ds(r),s.colorSpace=Ue,gl.set(i,s)}return s}function In(i,t,e=14){i.shadowColor=t,i.shadowBlur=e}const N0=()=>yn("blade",128,512,i=>{const t=i.createLinearGradient(0,512,0,0);t.addColorStop(0,"rgba(255,122,92,0.05)"),t.addColorStop(.5,"rgba(255,140,110,0.35)"),t.addColorStop(1,"rgba(255,230,210,0.8)"),i.fillStyle=t,i.strokeStyle="#ffb7a3",i.lineWidth=4,In(i,"#ff7a5c"),i.beginPath(),i.moveTo(64,6),i.lineTo(92,90),i.lineTo(84,420),i.lineTo(44,420),i.lineTo(36,90),i.closePath(),i.fill(),i.stroke(),i.lineWidth=2,i.beginPath(),i.moveTo(64,30),i.lineTo(64,400),i.stroke(),i.fillStyle="#ffb7a3",i.fillRect(22,424,84,12),i.fillRect(54,436,20,60)}),F0=()=>yn("shield",256,256,i=>{const t=i.createRadialGradient(128,128,10,128,128,120);t.addColorStop(0,"rgba(92,200,255,0.1)"),t.addColorStop(1,"rgba(92,200,255,0.45)"),i.fillStyle=t,i.strokeStyle="#a9e6ff",i.lineWidth=5,In(i,"#5cc8ff"),i.beginPath();for(let e=0;e<6;e++){const n=e/6*Math.PI*2-Math.PI/2;i.lineTo(128+Math.cos(n)*110,128+Math.sin(n)*110)}i.closePath(),i.fill(),i.stroke(),i.lineWidth=2,i.beginPath();for(let e=0;e<6;e++){const n=e/6*Math.PI*2-Math.PI/2;i.lineTo(128+Math.cos(n)*70,128+Math.sin(n)*70)}i.closePath(),i.stroke()}),_l=()=>yn("ring",256,256,i=>{i.strokeStyle="#ffffff",In(i,"#ffffff",10),i.lineWidth=6,i.beginPath(),i.arc(128,128,110,0,Math.PI*2),i.stroke(),i.lineWidth=2,i.beginPath(),i.arc(128,128,96,0,Math.PI*2),i.stroke()}),O0=()=>yn("tick",32,64,i=>{i.fillStyle="#fff",In(i,"#fff",8),i.fillRect(11,8,10,48)}),k0=(i,t)=>yn(`tag:${i}:${t}`,160,96,e=>{const n=I0[i]??"#ffffff";e.fillStyle="rgba(255,255,255,0.1)",e.strokeStyle=n,e.lineWidth=4,In(e,n,12),e.beginPath(),e.roundRect(8,8,144,80,14),e.fill(),e.stroke(),e.shadowBlur=0,e.fillStyle=n,e.textAlign="center",e.textBaseline="middle",e.font=`700 38px ${os}`,e.fillText(U0[i]??"?",48,50),e.font=`700 30px ${$n}`,e.fillText(t,108,52)}),vl=(i,t)=>yn(`chip:${i}:${t}`,128,128,e=>{const n=D0[i]??"#fff";e.strokeStyle=n,e.fillStyle="rgba(255,255,255,0.08)",e.lineWidth=5,In(e,n,14),e.beginPath(),e.arc(64,64,52,0,Math.PI*2),e.fill(),e.stroke(),e.shadowBlur=0,e.fillStyle=n,e.textAlign="center",e.textBaseline="middle",e.font=`700 44px ${os}`,e.fillText(i[0],64,54),e.font=`700 26px ${$n}`,e.fillText(`Lv${t}`,64,94)}),B0=()=>yn("gauge",64,256,i=>{i.strokeStyle="#ff5d73",i.lineWidth=4,In(i,"#ff5d73",10),i.beginPath(),i.roundRect(8,8,48,240,20),i.stroke()}),Vs=(i,t)=>yn(`num:${i}:${t}`,128,64,e=>{e.fillStyle=t,In(e,t,10),e.font=`700 44px ${$n}`,e.textAlign="center",e.textBaseline="middle",e.fillText(i,64,34)}),xl=()=>yn("core",128,128,i=>{const t=i.createRadialGradient(64,64,0,64,64,60);t.addColorStop(0,"rgba(255,255,255,0.9)"),t.addColorStop(.35,"rgba(255,255,255,0.3)"),t.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=t,i.fillRect(0,0,128,128)}),Ml=()=>yn("shell",128,128,i=>{i.strokeStyle="#fff",i.lineWidth=5,In(i,"#fff",10),i.beginPath(),i.moveTo(14,100),i.lineTo(14,40),i.lineTo(64,12),i.lineTo(114,40),i.lineTo(114,100),i.stroke()});function He(i,t,e=.8){const n=new pt(new Ln(1,1),new qe({map:i,color:t,transparent:!0,opacity:e,depthWrite:!1,depthTest:!1,blending:2,toneMapped:!1}));return n.renderOrder=8,n}class z0{constructor(t){q(this,"root",new ge);q(this,"h");q(this,"blade");q(this,"bladeNum");q(this,"shield");q(this,"shieldRing");q(this,"shieldNum");q(this,"halo");q(this,"ticks",new ge);q(this,"gauge");q(this,"gaugeFill");q(this,"core");q(this,"shellL");q(this,"shellR");q(this,"tags",new ge);q(this,"orbit",new ge);q(this,"healMark");q(this,"redirMark");q(this,"delayMark");q(this,"cur",{blade:0,shield:0,halo:0,gauge:0,core:0,shells:0,mods:0});q(this,"goal",{...this.cur});q(this,"sig","");q(this,"ld",L0);q(this,"bladeLen",1);q(this,"shieldSize",.5);q(this,"fx",{kind:"",k:0,swing:0,col:"#ffffff"});q(this,"chestPt",new xe);this.h=t;const e=t;this.blade=He(N0(),16777215),this.blade.position.set(e*.42,e*.5,.01),this.bladeNum=He(Vs("0","#ffd0c2"),16777215,.95),this.bladeNum.scale.set(.34,.17,1),this.shield=He(F0(),16777215),this.shield.position.set(-e*.42,e*.42,.01),this.shieldRing=He(_l(),"#a9e6ff",.9),this.shieldNum=He(Vs("0","#bfeaff"),16777215,.95),this.shieldNum.scale.set(.34,.17,1),this.halo=He(_l(),"#ffd24a",.7),this.halo.position.set(0,e*1.02,0),this.halo.scale.set(.8,.28,1),this.halo.add(this.ticks),this.gauge=He(B0(),"#ff5d73",.8),this.gauge.position.set(-e*.36,e*.17,0),this.gauge.scale.set(.16,.64,1),this.gaugeFill=He(xl(),"#ff5d73",0),this.gaugeFill.position.set(-e*.36,e*.17,0),this.core=He(xl(),"#ffffff",0),this.core.position.set(0,e*.58,0),this.core.scale.setScalar(.6),this.shellL=He(Ml(),"#bfeaff",0),this.shellL.position.set(-e*.24,e*.72,0),this.shellL.scale.setScalar(.5),this.shellR=He(Ml(),"#bfeaff",0),this.shellR.position.set(e*.24,e*.72,0),this.shellR.scale.set(-.5,.5,1),this.chestPt.position.set(0,e*.55,0),this.root.add(this.chestPt),this.tags.position.set(0,e*.55,-.02),this.orbit.position.set(0,e*.4,0);const n=(s,r)=>He(vl(r,0),s,0);this.healMark=n("#5dffb0","疗"),this.redirMark=n("#ffd24a","移"),this.delayMark=n("#cfa37f","延");for(const s of[this.healMark,this.redirMark,this.delayMark])s.visible=!1;this.root.add(this.blade,this.bladeNum,this.shield,this.shieldRing,this.shieldNum,this.halo,this.gauge,this.gaugeFill,this.core,this.shellL,this.shellR,this.tags,this.orbit)}anchorWorld(t,e){return(t==="blade"?this.blade:t==="shield"?this.shield:t==="halo"?this.halo:t==="gauge"?this.gauge:this.chestPt).getWorldPosition(e)}set(t){const e=JSON.stringify(t);if(e===this.sig)return;this.sig=e,this.ld=t;const n=this.h,s=!t.down;this.goal.blade=s&&t.atk>0?1:0,this.goal.shield=s&&t.block>0?1:0,this.goal.halo=s&&t.conts>0?1:0,this.goal.gauge=s&&t.blood>0?1:0,this.goal.core=s&&t.kw==="不屈"&&!t.kwSpent?1:0,this.goal.shells=s&&t.kw==="首挡"&&!t.kwSpent?1:0,this.goal.mods=s?1:0,this.bladeLen=n*(.34+Math.min(t.atk,24)*.026),this.shieldSize=n*(.2+Math.min(t.block,8)*.028),this.bladeNum.material.map=Vs(String(t.atk),"#ffd0c2"),this.shieldNum.material.map=Vs(`-${t.block}`,"#bfeaff"),this.ticks.clear();const r=Math.min(t.contLeft,8);for(let l=0;l<r;l++){const c=l/Math.max(r,1)*Math.PI*2,h=He(O0(),"#ffd24a",.9);h.position.set(Math.cos(c)*.5,Math.sin(c)*.5,0),h.rotation.z=c-Math.PI/2,h.scale.set(.06,.12,1),this.ticks.add(h)}this.tags.clear();const a=t.clauses.length;t.clauses.forEach((l,c)=>{const h=He(k0(l.kind,l.label),16777215,.85),u=a===1?0:c/(a-1)-.5;h.position.set(u*Math.min(1.4,.3*a+.5)*1.5,n*.42+.12*Math.cos(u*Math.PI)-.1*Math.abs(u)*2,0),h.rotation.z=-u*.5,h.scale.set(.48,.29,1),h.userData.base=h.position.clone(),this.tags.add(h)}),this.orbit.clear(),t.statuses.forEach((l,c)=>{const h=He(vl(l.name,l.lv),16777215,.9);h.scale.setScalar(.3),h.userData.phase=c/Math.max(t.statuses.length,1)*Math.PI*2,this.orbit.add(h)});const o=[[this.healMark,t.heal>0,-.3],[this.redirMark,t.redirect,0],[this.delayMark,t.delay>0,.3]];this.orbit.add(this.healMark,this.redirMark,this.delayMark);for(const[l,c,h]of o)l.visible=c&&s,l.position.set(h*2,n*.5,0),l.scale.setScalar(.28),l.material.opacity=.9}update(t,e){const n=1-Math.exp(-e*6),s=this.h;for(const f of Object.keys(this.cur))this.cur[f]+=(this.goal[f]-this.cur[f])*n;const r=this.cur,a=Math.sin(t*1.6)*.02,o=this.fx,l=o.k,c=Math.max(r.blade,o.kind==="atk"?l:0),h=Math.max(r.shield,o.kind==="mit"?l:0);this.blade.visible=c>.02,this.blade.scale.set(.2*c*(1+.7*l*(o.kind==="atk"?1:0)),this.bladeLen*c,1),this.blade.position.y=s*.28+this.bladeLen*c/2+a,this.blade.rotation.z=-.12-(o.kind==="atk"?o.swing*1.25:0),this.blade.material.opacity=.8+.2*(o.kind==="atk"?l:0),this.bladeNum.visible=this.blade.visible,this.bladeNum.position.set(this.blade.position.x+.02,this.blade.position.y+this.bladeLen*r.blade/2+.12,0),this.bladeNum.material.opacity=c,this.shield.visible=h>.02;const u=this.shieldSize*h*(1+.55*(o.kind==="mit"?l:0));this.shield.scale.setScalar(u),this.shield.position.y=s*.42+a,this.shield.rotation.z=Math.sin(t*.8)*.04,this.shieldRing.visible=this.shield.visible,this.shieldRing.scale.setScalar(u*1.18+Math.sin(t*3)*.01),this.shieldRing.position.copy(this.shield.position),this.shieldRing.rotation.z=t*.4,this.shieldNum.visible=this.shield.visible,this.shieldNum.position.set(this.shield.position.x,this.shield.position.y-u*.62-.08,0),this.shieldNum.material.opacity=h,this.halo.visible=r.halo>.02,this.halo.rotation.z=0,this.halo.scale.set(.8*r.halo,.28*r.halo,1),this.ticks.rotation.z=t*.5;const d=this.gauge.material;d.opacity=.8*r.gauge,this.gauge.visible=r.gauge>.02;const p=this.gaugeFill.material,g=Math.min(1,this.ld.blood/Math.max(1,this.ld.bloodRoom));p.opacity=.75*r.gauge,this.gaugeFill.visible=this.gauge.visible,this.gaugeFill.scale.set(.12,.58*g+.001,1),this.gaugeFill.position.y=this.gauge.position.y-.29+.29*g;const _=this.core.material;_.opacity=.55*r.core*(.7+.3*Math.sin(t*3.2));const m=l>.01&&o.kind!=="atk"&&o.kind!=="mit";m?(_.color.set(o.col),_.opacity=Math.max(_.opacity,.95*l),this.core.scale.setScalar(.6+1.3*l)):(_.color.set("#ffffff"),this.core.scale.setScalar(.6)),this.core.visible=r.core>.02||m;for(const f of[this.shellL,this.shellR])f.material.opacity=.7*r.shells,f.visible=r.shells>.02;this.tags.children.forEach((f,v)=>{const T=f.userData.base;f.position.y=T.y+Math.sin(t*1.4+v)*.025,f.material.opacity=.85*r.mods}),this.orbit.children.forEach(f=>{if(f.userData.phase===void 0)return;const v=f.userData.phase+t*.7;f.position.set(Math.cos(v)*s*.52,Math.sin(v)*.12+Math.sin(t+v)*.02,-.01),f.renderOrder=Math.sin(v)>0?6:9})}}const we={w:2.2,d:1.75,t:.12},ve=as==="neo"?{w:2.9,d:2.15,t:.06}:{w:2.62,d:2.05,t:.06},Sl=as==="neo"?.2:0,_n={h:2.3},Hn={z:-.18,r:.62},yl=2,ti=ve.t+we.t,bl=new ou,Ws=new Ln(1,1),G0=new lr({color:408114,metalness:.3,roughness:.42,clearcoat:.8}),bc=new Je({color:en.copper,metalness:1,roughness:.25}),Tc=new Je({color:en.silver,metalness:1,roughness:.25}),pa=new lr({color:726548,roughness:.25,clearcoat:1}),H0=new lr({color:1015660,roughness:.3,clearcoat:1});function ta(i,t){return i.rotation.x=-Math.PI/2,i.position.y=t,i}function V0(){const i=new ge,t=new pt(new be(.06,.06,.15,20,1,!1,0,Math.PI),pa),e=new pt(new Ln(.12,.15),pa);e.rotation.y=Math.PI/2,t.add(e),t.position.y=.13,i.add(t);for(let n=-1;n<=1;n++){const s=new pt(new be(.007,.007,.06,6),Tc);s.position.set(0,.03,n*.035),i.add(s)}return i}function Tl(i){const t=new ge,e=new pt(new be(.07,.07,i,20),H0);e.position.y=i/2;const n=new pt(new be(.068,.068,.012,20),Tc);return n.position.y=i+.006,t.add(e,n),t}function W0(i){const t=new ge,e=new pt(new fe(i,.035,i),pa);e.position.y=.018,t.add(e);for(let n=0;n<4;n++){const s=-i/2+i/5*(n+1);for(const r of[-1,1]){const a=new pt(new fe(.03,.008,.012),bc);a.position.set(r*(i/2+.012),.004,s),t.add(a)}}return t}function X0(){const i=document.createElement("canvas");i.width=i.height=512;const t=i.getContext("2d");t.translate(256,256),t.strokeStyle="#ffffff",t.lineWidth=6,t.beginPath(),t.arc(0,0,240,0,Math.PI*2),t.stroke(),t.lineWidth=2,t.beginPath(),t.arc(0,0,200,0,Math.PI*2),t.stroke(),t.beginPath(),t.arc(0,0,120,0,Math.PI*2),t.stroke();for(let n=0;n<48;n++){const s=n/48*Math.PI*2,r=n%4===0?205:220;t.beginPath(),t.moveTo(Math.cos(s)*r,Math.sin(s)*r),t.lineTo(Math.cos(s)*236,Math.sin(s)*236),t.stroke()}const e=t.createRadialGradient(0,0,0,0,0,200);return e.addColorStop(0,"rgba(255,255,255,0.55)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.beginPath(),t.arc(0,0,200,0,Math.PI*2),t.fill(),new ds(i)}const $0=X0();function q0(i){return new Ae({uniforms:{uColor:{value:new It(i)},uTime:{value:0},uAmp:{value:1}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",fragmentShader:`uniform vec3 uColor; uniform float uTime; uniform float uAmp; varying vec2 vUv;
      void main(){
        float fade = pow(1.0 - vUv.y, 2.2);
        float lines = 0.75 + 0.25 * sin(vUv.y * 60.0 - uTime * 4.0);
        gl_FragColor = vec4(uColor * 1.2, fade * lines * 0.22 * uAmp);
      }`,transparent:!0,depthWrite:!1,side:2,blending:2,toneMapped:!1})}class r_{constructor(t,e){q(this,"root",new ge);q(this,"body",new ge);q(this,"figure",new ge);q(this,"bill",new ge);q(this,"hitTargets",[]);q(this,"pMat");q(this,"circuit");q(this,"beam");q(this,"emitMat");q(this,"glassMat");q(this,"frameMat");q(this,"plate");q(this,"mech",null);q(this,"ledMats",[]);q(this,"warn");q(this,"outline");q(this,"hover",0);q(this,"hoverTarget",0);q(this,"selected",!1);q(this,"glitch",0);q(this,"ko",0);q(this,"koTarget",0);q(this,"fxOn",!0);q(this,"distortSaved",.4);q(this,"greenSaved",.15);q(this,"armor",new z0(_n.h));q(this,"spec");this.spec={...t};const n=en.side[t.side];if(this.root.add(this.body),as==="neo")this.mech=w0(ve.w,ve.d,ve.t,we.w,n,e),this.body.add(this.mech.group),this.root.add(E0(ve.w,ve.d,Sl,n));else{const w=new pt(new Sn(ve.w,ve.t,ve.d,2,.03),G0);w.position.y=ve.t/2,this.body.add(w);for(let L=0;L<16;L++){const k=new pt(new fe(.07,.006,.13),bc);k.position.set(-.9+L*.12,ve.t+.003,ve.d/2-.08),this.body.add(k)}const C=(we.w+ve.w)/4;for(let L=0;L<3;L++){const k=V0();k.position.set(-C,ve.t,-.7+L*.2),this.body.add(k)}const I=Tl(.2),A=Tl(.14);I.position.set(C,ve.t,-.7),A.position.set(C,ve.t,-.47);const U=W0(.15);U.position.set(C,ve.t,-.15),this.body.add(I,A,U)}this.plate=ta(new pt(Ws,new qe({toneMapped:!1})),ve.t+.02);const s=we.w-.2;this.plate.scale.set(s,s/4,1),this.plate.position.z=we.d/2-.08-s/8,this.plate.renderOrder=2,this.body.add(this.plate),this.glassMat=new lr({color:en.glass,transparent:!0,opacity:.14,roughness:.06,metalness:0,clearcoat:.35,clearcoatRoughness:.12,iridescence:.25,iridescenceIOR:1.35,envMapIntensity:.2,depthWrite:!1});const r=new pt(new Sn(we.w,we.t,we.d,3,.05),this.glassMat);r.position.y=ve.t+we.t/2,r.renderOrder=3,r.userData.card=this,this.hitTargets.push(r),this.body.add(r);const a=512/we.w,o=768/we.d,l=Hn.r+.08,c=[(we.w/2-l)*a,(we.d/2+Hn.z-l)*o,l*2*a,l*2*o];this.circuit=P0(as==="neo"?T0(e*13+3,c):M0(e*13+3,c),n,.06,.35);const h=ta(new pt(Ws,this.circuit),ti+.002);h.scale.set(we.w-.06,we.d-.06,1),h.renderOrder=4,this.body.add(h),this.emitMat=new qe({map:$0,color:n,transparent:!0,depthWrite:!1,blending:2,toneMapped:!1});const u=ta(new pt(Ws,this.emitMat),ti+.004);u.scale.setScalar(Hn.r*2),u.position.z=Hn.z,u.renderOrder=5,this.body.add(u),this.frameMat=new qe({color:n,toneMapped:!1});const d=.3,p=.026,g=we.w/2-.06,_=we.d/2-.06;for(const w of[-1,1])for(const C of[-1,1]){const I=new pt(new fe(d,.008,p),this.frameMat);I.position.set(w*(g-d/2),ti+.005,C*_);const A=new pt(new fe(p,.008,d),this.frameMat);A.position.set(w*g,ti+.005,C*(_-d/2)),this.body.add(I,A)}const m=Math.ceil(t.max/yl),f=we.w-.3,v=.014,T=(f-v*(m-1))/m;for(let w=0;w<m;w++){const C=new Je({color:663323,emissive:en.hp,emissiveIntensity:0,roughness:.4}),I=new pt(new fe(T,.03,.07),C);I.position.set(-f/2+T/2+w*(T+v),ti+.015,this.plate.position.z-s/8-.07),this.body.add(I),this.ledMats.push(C)}this.figure.position.set(0,ti,Hn.z),this.body.add(this.figure),this.beam=q0(n);const S=new pt(new be(Hn.r*.95,Hn.r*.8,_n.h*.9,32,1,!0),this.beam);S.position.y=_n.h*.9/2,S.renderOrder=6,this.figure.add(S);const E=bl.load(`./portraits/${t.art}.png`);E.colorSpace=Ue,E.anisotropy=8,this.pMat=C0(E,e),this.pMat.uniforms.uFade.value=.03,t.flip&&this.pMat.uniforms.uRect.value.set(1,0,-1,1);const y=new pt(Ws,this.pMat);y.scale.set(_n.h*(832/1216),_n.h,1),y.position.y=_n.h/2,y.renderOrder=7,y.userData.card=this,this.hitTargets.push(y),this.bill.add(y),this.bill.add(this.armor.root),this.figure.add(this.bill),this.warn=new Rh(new Ql({transparent:!0,depthWrite:!1,depthTest:!1,toneMapped:!1})),this.warn.scale.set(1.15,.29,1),this.warn.position.set(0,_n.h+.25,0),this.warn.renderOrder=10,this.bill.add(this.warn),this.outline=new qe({color:en.hud,transparent:!0,opacity:0,toneMapped:!1});const R=ve.w+.16,x=ve.d+.16;for(const[w,C,I,A]of[[R,.03,0,-x/2],[R,.03,0,x/2],[.03,x,-R/2,0],[.03,x,R/2,0]]){const U=new pt(new fe(w,.01,C),this.outline);U.position.set(I,.006,A),this.root.add(U)}this.refreshHp()}setLoadout(t){this.armor.set(t)}setName(t){this.spec.name!==t&&(this.spec.name=t,this.refreshHp())}setArt(t,e=!1){if(this.spec.art===t&&!!this.spec.flip===e)return;this.spec.art=t,this.spec.flip=e;const n=bl.load(`./portraits/${t}.png`);n.colorSpace=Ue,n.anisotropy=8,this.pMat.uniforms.map.value=n,this.pMat.uniforms.uRect.value.set(...e?[1,0,-1,1]:[0,0,1,1])}setActive(t){this.root.visible=t}setSelected(t){this.selected=t}setHover(t){this.hoverTarget=t?1:0}setDistort(t){this.distortSaved=t,this.fxOn&&(this.pMat.uniforms.uDistort.value=t)}setGreen(t){this.greenSaved=t,this.fxOn&&(this.pMat.uniforms.uMix.value=t)}setScreenFx(t){this.fxOn=t,this.pMat.uniforms.uDistort.value=t?this.distortSaved:0,this.pMat.uniforms.uMix.value=t?this.greenSaved:0}hit(t){this.glitch=1.3,this.spec.hp=Math.max(0,this.spec.hp-t),this.spec.incoming=0,this.spec.hp<=0&&(this.koTarget=1),this.refreshHp()}syncHp(t,e){const n=this.spec.hp!==t||this.spec.max!==e;this.spec.hp=t,this.spec.max=e,this.spec.incoming=0,this.koTarget=t<=0?1:0,n&&this.refreshHp()}reset(t){this.spec={...t},this.koTarget=0,this.ko=0,this.refreshHp()}refreshHp(){var c,h;const{hp:t,max:e,incoming:n=0,name:s,side:r}=this.spec,a=t-n;this.ledMats.forEach((u,d)=>{const p=d*yl;u.userData.state=p>=t?"off":n&&p>=Math.max(a,0)?"hit":"on",u.emissive.setHex(u.userData.state==="hit"?en.incoming:en.hp)});const o=this.plate.material;(c=o.map)==null||c.dispose(),o.map=S0(s,r,t,e,n),o.needsUpdate=!0;const l=this.warn.material;(h=l.map)==null||h.dispose(),l.map=n?y0(a<=0?"✕ 击倒":`−${n} → ${a}`,a<=0):null,l.opacity=0,l.needsUpdate=!0}update(t,e,n){var o;const s=1-Math.exp(-e*10);this.hover+=(this.hoverTarget-this.hover)*s,this.ko+=(this.koTarget-this.ko)*(1-Math.exp(-e*3)),this.glitch=Math.max(0,this.glitch-e*1.5),this.body.position.y=Sl+(this.selected?.08:0)+this.hover*.08;const r=this.figure.getWorldPosition(new D);this.bill.quaternion.copy(n.quaternion),this.bill.scale.set(1+this.ko*.15,Math.max(.02,1-this.ko)*(1+Math.sin(t*1.4+r.x)*.006),1),this.figure.position.y=ti+.02+Math.sin(t*1.2+r.x)*.015,this.armor.update(t,e),this.pMat.uniforms.uTime.value=t,this.pMat.uniforms.uGlitch.value=this.fxOn?this.glitch+this.ko*.6:0,this.pMat.uniforms.uOpacity.value=1-this.ko*.6,this.beam.uniforms.uTime.value=t,this.beam.uniforms.uAmp.value=(.75+this.hover*.35+this.glitch*.6)*(1-this.ko),this.emitMat.opacity=(.38+.06*Math.sin(t*2.5)+this.hover*.15)*(1-this.ko*.7),this.circuit.uniforms.uTime.value=t,(o=this.mech)==null||o.update(t),this.circuit.uniforms.uPulse.value=.35*(1-this.ko)+this.glitch*.6,this.glassMat.opacity=.14+this.ko*.4,this.glassMat.color.setHex(this.ko>.5?2766131:en.glass),this.frameMat.color.setHex(this.ko>.5?2899258:en.side[this.spec.side]);const a=Math.pow(.5+.5*Math.sin(t*4.4),2);for(const l of this.ledMats){const c=l.userData.state;l.emissiveIntensity=c==="on"?1.2:c==="hit"?.08+1.9*a:0}this.outline.opacity+=((this.selected?.5:this.hover*.2)-this.outline.opacity)*s,this.warn.position.y=_n.h+.25+Math.sin(t*2.2)*.04}}const Y0={结构:"#93a8c9",范围:"#a982ff",对象:"#25d8c4",动作:"#ff9a3c",引用:"#a6e35a",状态:"#ff5dc8",触发:"#ffd24a",时间:"#cfa37f",关键词:"#ffffff"},K0={选择:["结构",1,0],若:["结构",2,0],若有:["结构",2,1],一个:["范围",1,0],相邻:["范围",2,0],随从:["对象",1,0],自身:["对象",1,0],来源:["对象",2,0],造成:["动作",1,1],伤害:["动作",1,1],施加:["动作",1,1],恢复:["动作",1,1],减少:["动作",1,1],增加:["动作",1,1],转为:["动作",2,1],移除:["动作",2,3],延后:["动作",2,5],生命上限:["引用",2,0],较低者:["引用",2,0],易伤:["状态",2,2],灼烧:["状态",2,2],衰弱:["状态",2,2],当:["触发",2,1],回合结束:["触发",2,1],之后:["时间",1,0],持久:["时间",2,3],不屈:["关键词",3,0]};function a_(i){return i.split(/\s+/).filter(Boolean).map(t=>{const e=t.startsWith("~");return e&&(t=t.slice(1)),t==="红方"?{k:"side",side:"r",auto:e}:t==="蓝方"?{k:"side",side:"b",auto:e}:t.startsWith("@")?{k:"unit",name:t.slice(1)}:t.startsWith("#")?{k:"num",v:+t.slice(1)}:{k:"word",w:t,auto:e}})}const El={r:"#ff5a6e",b:"#2fd8ff"};function ma(i,t){const e=document.createElement("span");switch(e.className="w",t&&e.classList.add("fresh"),i.k){case"word":{const n=K0[i.w];e.textContent=i.w,e.style.setProperty("--c",n?Y0[n[0]]:"#93a8c9"),e.dataset.tier=String((n==null?void 0:n[1])??1),i.auto&&e.classList.add("w-auto");break}case"side":e.textContent=i.side==="r"?"红方":"蓝方",e.style.setProperty("--c",El[i.side]),e.classList.add("w-side"),i.auto&&e.classList.add("w-auto");break;case"unit":e.textContent=i.name,e.style.setProperty("--c",El[i.side??(i.name[0]==="红"?"r":"b")]),e.classList.add("w-unit");break;case"num":e.textContent=String(i.v),e.classList.add("w-num");break;case"time":e.textContent="";break}return e}class o_{constructor(t,e,n,s){q(this,"el");q(this,"body");q(this,"code");q(this,"toks",[]);q(this,"sec",null);this.emptyText=n,this.el=document.createElement("div"),this.el.className=`ro ro-${t}`,this.el.innerHTML=`<i class="ro-lead"></i><div class="ro-head"><span class="ro-name">${e}</span><span class="ro-code"></span></div><div class="ro-body"></div>`,this.body=this.el.querySelector(".ro-body"),this.code=this.el.querySelector(".ro-code"),s&&(this.el.classList.add("clickable"),this.el.addEventListener("click",s)),this.render(!1)}get tokens(){return this.toks}get time(){return this.sec}set(t,e=null,n=!1){this.toks=t.filter(s=>s.k!=="time"),this.sec=e,this.render(n)}push(t){var e;this.toks.push(t),(e=this.body.querySelector(".ro-empty"))==null||e.remove(),this.body.appendChild(ma(t,!0))}pop(){this.toks.pop(),this.render(!1)}setActive(t){this.el.classList.toggle("active",t)}setFocus(t){this.el.classList.toggle("focus",t)}setDead(t){this.el.classList.toggle("dead",t)}render(t){if(this.code.textContent=this.sec===null?"":`T+${String(this.sec).padStart(2,"0")}s`,this.body.innerHTML="",!this.toks.length){const e=document.createElement("span");e.className="ro-empty",e.textContent=this.emptyText,this.body.appendChild(e);return}this.toks.forEach((e,n)=>{const s=ma(e,t);t&&(s.style.animationDelay=`${n*40}ms`),this.body.appendChild(s)})}}const ea=["并","续","择","血"],Ec={并:"chain",续:"cont",择:"pick",血:"blood"},J0={并:"连段",续:"续出",择:"命中",血:"血债"},Ai={并:"并流",续:"续流",择:"择流",血:"血流"},ls={并:34,续:60,择:63,血:81},ga=21,ir=3,wc=["小剑","小盾","小咒"],Ac=["剑","盾","咒"],Cc=6,Rc=6,ka=12,Pc=1,Ba=2,Lc=3,$e=10,za=12,Dc=.15,Z0=[.1,.25,.45,.7],wl=[2,3,4,5],Al=2,Ic=4,Q0=2,na={3:2,5:3,7:4},Uc=7,Nc=1,j0=1,tg=0,eg=0,Fc=3,cs=10,hs=2,Cl=3,vn={易伤:{price:1,kind:"status",on:"enemy",desc:"给敌人上易伤：每级让它每次多受 1 点伤害。每过一轮自动 +1 级"},灼烧:{price:1,kind:"status",on:"enemy",desc:"给敌人上灼烧：每轮结束时，每级让它掉 1 点血。每过一轮自动 +1 级"},衰弱:{price:1,kind:"status",on:"enemy",desc:"给敌人上衰弱：每级让它每次少打 1 点伤害。每过一轮自动 +1 级"},转移:{price:2,kind:"redirect",on:"ally",desc:"本轮打向这个随从的敌方伤害，转给出手的人"},延后:{price:1,kind:"delay",on:"act",desc:"把对方已宣告的一句往后推 N 秒；推出时间轴就落空"},移除:{price:1,kind:"remove",on:"enemy",desc:"拆掉一个敌人身上的减伤、转移，并掐断它挂着的续"}},_a=["易伤","灼烧","衰弱","转移","延后","移除"],Oc=["易伤","灼烧","衰弱"],va={首挡:"每轮第一次被敌人打中，整下挡掉",不屈:"每轮第一次被打到 0 血，留 1 血"},ei={并:{words:{易伤:2,灼烧:1,衰弱:2,转移:2,延后:1,移除:2},kws:["不屈","首挡","首挡"]},续:{words:{易伤:2,灼烧:2,衰弱:2,转移:1,延后:1,移除:2},kws:["首挡","不屈","不屈"]},择:{words:{易伤:2,灼烧:1,衰弱:1,转移:2,延后:2,移除:2},kws:["首挡","不屈","首挡"]},血:{words:{易伤:2,灼烧:2,衰弱:1,转移:2,延后:1,移除:2},kws:["不屈","不屈","首挡"]}};function xa(i){const t=ei[i];return{cls:i,words:{...t.words},kws:[...t.kws],hp:[7,7,7]}}function ng(i,t){const e={clauses:Lc,and:Ba,slots:0,blood:0,late:!1,wind:1,once:!1,cont_single:!1,freecount:!1,norep:!1,noheal:!1,nodef:!1};return i==="并"?(e.clauses=Uc,e.and=Nc,e.wind=eg,e.once=!0):i==="续"?(e.slots=Fc,e.cont_single=!0):i==="择"?(e.late=!0,e.freecount=!0,e.norep=!0):(e.blood=99,e.noheal=!0,e.nodef=!0),e}function ig(i,t){let e=0;for(const n in i){if(!vn[n])return`没有【${n}】这个进阶词`;if(i[n]>hs)return`【${n}】最多带 ${hs} 张`;e+=i[n]}if(e!==cs)return`卡组要正好 ${cs} 张进阶词（现在 ${e} 张）`;if(t.length!==Cl)return`要选 ${Cl} 个关键词（每个随从一个）`;for(const n of t)if(!va[n])return`没有【${n}】这个关键词`;return""}const kc={并:"并",续:"持续",择:"选择",血:"自身"},ia={并:"#2fb8c8",续:"#d89a2a",择:"#9ac43a",血:"#c0283a"},Ys={并:`上限：一句最多 ${Uc} 段（别人 3 段），每多一段只加 ${Nc} 行动点（别人 2），起手不因为段多变晚。限制：一句里同一个动作词（造成、恢复、减伤、易伤、灼烧、衰弱、转移、延后、移除）只能用一次`,续:`上限：【持续】能接在 造成、恢复、减伤 后面，这一段以后每轮同一秒自动再来一次（不花行动点），同时能挂 ${Fc} 个续。限制：带【持续】的这句只能一段，不能接【并】。出手的随从倒下或被【移除】，它的续就断了`,择:"上限：【选择】几个目标不用数字牌，想选几个选几个；目标宣告时不定（对手只看到“待定”），双方宣告完再定，定好的人倒了自动换人。限制：句子里不能用【重复】",血:"上限：行动点不够时，用出手随从的生命来付，想付多少付多少（1 点生命顶 1 点行动点，至少留 1 血）。限制：用血付的句子里不能有【恢复】【减伤】【转移】"},Ma={并:"连段分：两段以上的句子里，兑现了几段就得几分；整句每段都兑现再 +1",续:"续出来的效果：续自动再来的那几次打出的伤害、回的血、挡下的伤害，加上你上的灼烧烧掉的、易伤多打的、衰弱让对方少打的",择:"命中：对敌人实际打掉的血（打空、被挡掉的不算）",血:"血债：用生命付掉的点数，加上用血付的句子对敌人打掉的血"},sg=[`· 双方各 3 个随从，共 ${ga} 点生命。被击倒的随从休整一轮，再满血回来。`,"· 每轮轮流宣告：一方定一个随从的一句，另一方再定一个，交替进行；每轮换一方先定。你能看到对方已经定下的句子（择流的目标除外）。","· 一句话就是一张张词拼起来的：比如 选择 2 个 敌方 随从，造成 3 点 伤害，重复 2 次。数字都是牌：1 免费无限用，2 以上要用手里的数字牌，每个位置一张。",`· 数字牌从哪来：你的职业得分到 10%、25%、45%、70% 时，各解锁两张 2、3、4、5（能反复用，用完冷却一轮）；一轮里掉了 ${Ic} 点以上血或有随从倒下，掷两个骰子，掷出几给一张几（只能用一次）；第 3、5、7 轮开始时各发一张保底数字 2、3、4（能反复用）。`,`· 行动点：开局 ${Cc}，每轮 +${Rc}，最多 ${ka}。一句的花费 = ${Pc} + 进阶词价格 + 每多一段（并）${Ba}。`,`· 时间轴 0~${$e} 秒：一句最早第（1 + 进阶词数 + 段数 − 1）秒起效；同一秒里减伤、转移这类保护先生效；出手的随从先被打倒，它的招就落空。`,`· 进阶词要组进卡组（${cs} 张，同名最多 ${hs} 张）；用过的那一张下一轮冷却。进阶词：易伤、灼烧、衰弱（状态，每过一轮自己 +1 级）、转移、延后、移除。`,"· 四个职业，各擅长一个基础词：",...["并","续","择","血"].map(i=>`    ${Ai[i]}（${kc[i]}）：${Ys[i]}。得分：${Ma[i]}。`),`· 先到自己目标分的赢；击倒一个敌人算目标分的 15%；打满 ${za} 轮比完成的百分比。`],rg=i=>{if(i.length!==3)return"要给三个随从各分一份生命";let t=0;for(const e of i){if(e<ir)return`每个随从至少 ${ir} 点生命`;t+=e}return t!==ga?`生命总和要正好 ${ga}（现在 ${t}）`:""},Rl=()=>({chain:0,cont:0,pick:0,blood:0,dmg:0});function ag(i,t){return{U:i,M:[Rl(),Rl()],cls:[...t],kob:[0,0],kos:[0,0],fz:[0,0],lost:[0,0],maxhit:0,conts:[],eff:{},retarget:[0,0],ev:null}}function Ga(i){return{U:i.U.map(e=>{const n={};for(const s in e.st)n[s]=[...e.st[s]];return{...e,st:n,lis:e.lis.map(s=>({...s})),msrc:[...e.msrc]}}),M:[{...i.M[0]},{...i.M[1]}],cls:i.cls,kob:[...i.kob],kos:[0,0],fz:[0,0],lost:[0,0],maxhit:0,conts:i.conts.map(e=>structuredClone(e)),eff:{},retarget:[0,0],ev:null}}const Sa=(i,t,e)=>i.M[t][Ec[e]]/ls[e]+i.kob[t],Ie=(i,t)=>{i.ev&&i.ev.push(t)},nn=(i,t,e,n)=>{n>0&&(i.M[t][e]+=n)},Wn=(i,t)=>`${i}:${t}`,Pl=i=>i.down===-1&&i.hp>0,og=(i,t)=>i.length===t.length&&i.every((e,n)=>e===t[n]);function ya(i,t,e,n){if(n<=0||e.down!==-1)return 0;const s=e.hp>0?Math.min(n,e.hp):0;return e.hp-=n,e.last=t,t!==e.side&&(i.M[t].dmg+=s,i.lost[e.side]+=s),s}function lg(i,t,e,n,s,r,a){const o=t.side,l=s.side;if(s.down!==-1||s.hp<=0)return 0;const c=i.cls,h=!!t.is_cont,u=o!==l;let d=r;const p=s.st.易伤,g=p?p[0]:0;d+=g;const _={},m=n.st.衰弱;if(m&&d>0){const T=Math.min(m[0],d);d-=T,u&&m[2]===l&&c[l]==="续"&&nn(i,l,"cont",T),T>0&&(_.衰弱=T)}if(s.mit>0&&d>0){const T=Math.min(s.mit,d);if(d-=T,u){for(const S of s.msrc)i.eff[S]=!0;c[l]==="续"&&s.mitc>0&&nn(i,l,"cont",Math.min(T,s.mitc))}T>0&&(_.减伤=T)}if(d>0&&u&&(s.shield??0)>0){const T=Math.min(s.shield,d);s.shield-=T,d-=T,_.血痂=T}d>0&&u&&s.kw==="首挡"&&!s.kws&&(s.kws=!0,_.首挡=d,d=0);let f=0;if(d>0&&u){for(const T of s.lis)if(T.k==="redirect"){f=d,d=0,i.eff[T.src]=!0,_.转移=f;break}}const v=ya(i,o,s,d);if(u&&v>0)switch(i.eff[Wn(t.ord,e)]=!0,c[o]){case"择":nn(i,o,"pick",v);break;case"血":(t.blood??0)>0&&nn(i,o,"blood",v);break;case"续":h?nn(i,o,"cont",v):g>0&&p[2]===o&&nn(i,o,"cont",Math.min(g,v));break}if(Ie(i,{t:a,type:"hit",src:n.uid,tgt:s.uid,amount:d,dealt:v,parts:_,vuln:g,cont:h}),f>0&&n.down===-1&&n.hp>0){const T=ya(i,l,n,f);c[l]==="择"&&nn(i,l,"pick",T),Ie(i,{t:a,type:"redirected",src:s.uid,tgt:n.uid,amount:f,dealt:T})}return v}function ba(i,t,e,n){i.fz[t.side]++,Ie(i,{t:e,type:"fizzle",ord:t.ord,uid:t.uid,why:n,cont:!!t.is_cont})}function cg(i,t,e,n){const s=t.side,r=(e.side??"enemy")==="enemy",a=i.U.filter(u=>Pl(u)&&u.side!==s===r),o=Math.min(e.count??1,a.length),l=[];for(const u of e.tg??[]){const d=i.U[u];Pl(d)&&a.includes(d)&&!l.includes(u)&&l.length<o&&l.push(u)}if(l.length>=o)return l;(e.tg??[]).length>0&&i.retarget[s]++;const c=a.filter(u=>!l.includes(u.uid)),h={};switch(e.k){case"atk":{const u={};for(const p of n)!p.done&&p.side!==s&&(u[p.uid]=(u[p.uid]??0)+1);const d=e.rep??1;for(const p of c){const g=p.st.易伤,m=(e.n+(g?g[0]:0)-p.mit)*d>=p.hp&&!(p.kw==="首挡"&&!p.kws);h[p.uid]=(m?1e3:0)+(m?100*(u[p.uid]??0):0)-p.hp}break}case"heal":for(const u of c)h[u.uid]=u.mx-u.hp;break;case"mit":{const u={};for(const d of n)if(!d.done&&d.side!==s){for(const p of d.cl)if(p.k==="atk")for(const g of p.tg??[])u[g]=(u[g]??0)+p.n*(p.rep??1)}for(const d of c)h[d.uid]=10*(u[d.uid]??0)-d.hp;break}case"st":for(const u of c){const d=u.st[e.st];h[u.uid]=-10*(d?d[0]:0)-u.hp}break;default:for(const u of c)h[u.uid]=-u.hp}c.sort((u,d)=>h[d.uid]-h[u.uid]);for(const u of c){if(l.length>=o)break;l.push(u.uid)}return l}function hg(i,t,e,n,s){const r=t.side,a=i.U,o=a[t.uid],l=i.cls,c=!!t.is_cont;let h=0;Ie(i,{t:s,type:"fire",ord:t.ord,uid:t.uid,cont:c,side:r}),t.cl.forEach((u,d)=>{let p=u.tg??[];if(u.tmode==="late"){const g=[...p];p=cg(i,t,u,e),Ie(i,{t:s,type:"lock",ord:t.ord,uid:t.uid,tgts:p,changed:!og(g,p)&&g.length>0})}switch(u.k){case"atk":for(let g=0;g<u.rep;g++)for(const _ of p)h+=lg(i,t,d,o,a[_],u.n,s);break;case"heal":for(let g=0;g<u.rep;g++)for(const _ of p){const m=a[_];if(m.down!==-1)continue;const f=Math.min(u.n,m.mx-m.hp);f>0&&(m.hp+=f,m.side===r&&(i.eff[Wn(t.ord,d)]=!0,l[r]==="续"&&c&&nn(i,r,"cont",f)),Ie(i,{t:s,type:"heal",src:o.uid,tgt:m.uid,amount:f,cont:c}))}break;case"mit":for(const g of p){const _=a[g];_.down===-1&&(_.mit+=u.n,c&&(_.mitc+=u.n),_.msrc.push(Wn(t.ord,d)),Ie(i,{t:s,type:"mit",tgt:_.uid,amount:u.n,cont:c}))}break;case"st":for(const g of p){const _=a[g];if(_.down!==-1)continue;const m=_.st[u.st];m?(m[0]+=1,m[1]=Math.max(m[1],n+u.n-1)):_.st[u.st]=[1,n+u.n-1,r],i.eff[Wn(t.ord,d)]=!0,Ie(i,{t:s,type:"status",tgt:_.uid,st:u.st,lv:_.st[u.st][0],end:_.st[u.st][1]})}break;case"redirect":for(const g of p){const _=a[g];_.down===-1&&(_.lis.push({k:"redirect",side:r,src:Wn(t.ord,d)}),Ie(i,{t:s,type:"listen",tgt:_.uid,k:"redirect"}))}break;case"delay":for(const g of e)g.ord===u.act&&!g.done&&(g.start+=u.n,i.eff[Wn(t.ord,d)]=!0,Ie(i,{t:s,type:"delay",ord:g.ord,sec:u.n,to:g.start}),g.start>$e&&(g.done=!0,ba(i,g,s,"被推出了时间轴")));break;case"remove":if(p.length>0){const g=a[p[0]];if(g.down===-1){const _=g.mit>0||g.lis.length>0,m=i.conts.filter(f=>f.uid===g.uid).length;i.conts=i.conts.filter(f=>f.uid!==g.uid),g.lis=[],g.mit=0,g.mitc=0,g.msrc=[],(_||m>0)&&(i.eff[Wn(t.ord,d)]=!0),Ie(i,{t:s,type:"remove",tgt:g.uid,broke:m})}}break}if((u.cont??1)>1&&!c){const g=structuredClone(u);delete g.cont,g.tg=[...p],g.tmode==="late"&&(g.tmode="choose"),i.conts.push({side:r,uid:t.uid,cl:g,start:t.start,left:u.cont-1}),Ie(i,{t:s,type:"cont_set",uid:t.uid,rounds:u.cont-1})}}),h>i.maxhit&&(i.maxhit=h)}function Ll(i,t,e){for(const n of i.U)if(n.down===-1&&n.hp<=0){if(n.kw==="不屈"&&!n.kws){n.kws=!0,n.hp=1,Ie(i,{t:e,type:"endure",tgt:n.uid});continue}n.down=t,n.hp=0,n.st={},n.lis=[],n.mit=0,n.mitc=0,n.msrc=[];const s=i.conts.filter(a=>a.uid===n.uid).length;i.conts=i.conts.filter(a=>a.uid!==n.uid);const r=n.last;r!=null&&r!==n.side&&(i.kob[r]+=Dc),i.kos[n.side]++,Ie(i,{t:e,type:"ko",tgt:n.uid,by:r??-1,broke:s})}}function ug(i){return i.conts.map((t,e)=>({side:t.side,uid:t.uid,start:t.start,cl:[t.cl],is_cont:!0,ord:1e3+e,def:["mit","heal"].includes(t.cl.k),blood:0,cost:0}))}const dg={atk:"伤害",heal:"恢复",mit:"减伤",st:"状态",redirect:"转移",delay:"延后",remove:"移除"};function dr(i,t,e){const n=t.map(s=>({...s,done:!1}));for(const s of ug(i))s.done=!1,n.push(s);i.conts=i.conts.filter(s=>(s.left-=1)>0);for(const s of n){const r=s.blood??0;r>0&&(i.U[s.uid].hp-=r,nn(i,s.side,"blood",r),Ie(i,{t:0,type:"blood",uid:s.uid,amount:r,ord:s.ord}))}for(let s=0;s<=$e;s++){const r=n.filter(a=>!a.done&&a.start===s);if(r.length){r.sort((a,o)=>{const l=a.def?0:1,c=o.def?0:1;return l!==c?l-c:a.ord-o.ord});for(const a of r)if(!(a.done||a.start!==s)){if(a.done=!0,i.U[a.uid].down!==-1){ba(i,a,s,"出手的随从已经倒下");continue}hg(i,a,n,e,s)}Ll(i,e,s)}}for(const s of n)s.done||(s.done=!0,ba(i,s,$e,"没赶上"));for(const s of i.U){if(s.down!==-1)continue;const r=s.st.灼烧;if(r){const a=ya(i,r[2],s,r[0]);if(r[2]!==s.side){const o=i.cls[r[2]];o==="续"?nn(i,r[2],"cont",a):o==="择"&&nn(i,r[2],"pick",a)}Ie(i,{t:$e+1,type:"burn",tgt:s.uid,amount:r[0],dealt:a})}}Ll(i,e,$e+1);for(const s of t){const r=s.side;if(i.cls[r]!=="并"||s.cl.length<2)continue;const a=new Set;let o=0;s.cl.forEach((h,u)=>{i.eff[Wn(s.ord,u)]&&(o++,a.add(dg[h.k]??h.k))});const l=o===s.cl.length,c=o+(l?j0+tg*Math.max(0,s.cl.length-2):0);c>0&&(nn(i,r,"chain",c),Ie(i,{t:$e+1,type:"chain",ord:s.ord,uid:s.uid,kinds:[...a],landed:o,points:c,all:l}))}}function fg(i){switch(i.k){case"st":return[i.st];case"redirect":return["转移"];case"delay":return["延后"];case"remove":return["移除"]}return[]}const Ha=i=>i.flatMap(fg),pg=i=>{const t=i.tmode??"choose";return t==="self"||t==="pick"?1:i.count!==void 0?i.count:(i.tg??[]).length};function Bc(i,t=!1){const e=[];for(const n of i){const s=t&&n.tmode==="late"?1:pg(n);switch(n.k){case"atk":case"heal":e.push(s,n.n,n.rep??1);break;case"mit":case"st":e.push(s,n.n);break;case"redirect":e.push(s);break;case"delay":e.push(n.n);break}(n.cont??1)>1&&e.push(n.cont)}return e.filter(n=>n>1)}function Va(i,t=Ba){let e=Pc+(i.length-1)*t;for(const n of Ha(i))e+=vn[n].price;return e}const fr=(i,t=1)=>1+Ha(i).length+(i.length-1)*t,mg=i=>i.every(t=>["mit","redirect","heal"].includes(t.k));function zc(i){return i.k==="st"?i.st:{atk:"造成",heal:"恢复",mit:"减伤",redirect:"转移",delay:"延后",remove:"移除"}[i.k]??i.k}const Ks=i=>i.filter(t=>(t.cont??1)>1).length;function gg(i,t){if(t.once){const e=new Set;for(const n of i){const s=zc(n);if(e.has(s))return`并流：一句里【${s}】只能用一次（换一个词接上去）`;e.add(s)}}return t.cont_single&&i.length>1&&Ks(i)>0?"续流：带【持续】的句子只能一段，不能接【并】":t.norep&&i.some(e=>(e.rep??1)>1)?"择流：句子里不能用【重复】":""}const Gc=.3,_g=.5,Dl=4,vg=1,xg=.6,Il=6,Mg=3;function Ul(i,t){let e=0;for(const n of i.U)if(n.down===-1)for(const s in n.st)n.st[s][2]===t&&(e+=n.st[s][0]);return e}function Nl(i,t){let e=0;for(const n of i.conts){if(n.side!==t)continue;const s=n.cl,r=s.count??(s.tg??[1]).length;e+=(s.n??1)*Math.max(1,r)*(s.rep??1)*n.left}return e*xg}function Wa(i,t,e){const n=i.clsOf(e),s=i.clsOf(1-e),r=Sa(t,e,n),a=Sa(t,1-e,s);let o=100*(r-a),l=0,c=0;for(const p of t.U)p.down===-1&&(p.side===e?l+=p.hp:c+=p.hp);o+=.8*(l-c),o+=.6*(Ul(t,e)-Ul(t,1-e));const h=n==="续"?100/ls[n]:.5,u=s==="续"?100/ls[s]:.5;o+=Nl(t,e)*h-Nl(t,1-e)*u;const d=Dc*100*_g;for(const p of t.U){if(p.down!==-1)continue;const g=1-p.hp/p.mx,_=Math.max(0,(Dl-p.hp)/Dl)*vg;o+=p.side!==e?d*(g+_):-d*(g+_)}return(r>=1||a>=1)&&(o+=r>a?500:a>r?-500:0),o}const Hc=i=>i.map(t=>t.uid);function Fl(i,t,e){if(e)return[null];const n=Hc(i);if(!n.length)return[];if(t>=n.length)return[n];if(t===1){const s=[[n[0]],[n[n.length-1]]];return n.length>2&&s.push([n[1]]),s}return[[n[0],n[1]],[n[0],n[n.length-1]]]}function Ci(i,t,e,n,s){const r={k:i,side:t,count:n};return e===null?(r.tmode="late",r.tg=[]):(r.tmode="choose",r.tg=e),Object.assign(r,s)}function Sg(i,t,e){const n=i.R,s=!!e.late,r=[],a=[];for(const v of n.U)v.down===-1&&(v.side!==t?r:a).push(v);r.sort((v,T)=>v.hp-T.hp);const o=Object.keys(i.usableValues(t)).map(Number).sort((v,T)=>T-v),l=[1];for(let v=0;v<Math.min(2,o.length);v++)l.push(o[v]);const c=e.freecount?[1,2,3]:l,h=i.declared.filter(v=>v.side!==t),u={};for(const v of h)for(const T of v.cl)if(T.k==="atk"){if(T.tmode==="late")for(const S of a)u[S.uid]=(u[S.uid]??0)+1;for(const S of T.tg??[])u[S]=(u[S]??0)+1}const d=[...a].sort((v,T)=>{const S=u[v.uid]??0,E=u[T.uid]??0;return S!==E?E-S:v.hp-T.hp}),p=Hc(d),g=[1];if(e.slots>0)for(let v=0;v<Math.min(2,o.length);v++)o[v]>1&&g.push(o[v]);const _=i.res[t].words,m=[];if(r.length){for(const v of c)if(!(v>r.length))for(const T of l){const S=[1];!e.norep&&o.length&&o[0]>1&&o[0]<=Mg&&S.push(o[0]);for(const E of S)for(const y of Fl(r,v,s))for(const R of g)m.push([[Ci("atk","enemy",y,v,{n:T,rep:E,cont:R})],-1])}}const f=a.filter(v=>v.hp<v.mx).sort((v,T)=>v.hp-v.mx-(T.hp-T.mx));if(f.length||e.slots>0){for(const v of c)if(!(v>a.length))for(const T of l){const S=[];for(const E of f)S.length<v&&S.push(E.uid);for(const E of a)S.length<v&&!S.includes(E.uid)&&S.push(E.uid);for(const E of g)!f.length&&E===1||m.push([[Ci("heal","ally",s?null:S,v,{n:T,rep:1,cont:E})],-1])}}if(h.length||e.slots>0||e.once){for(const v of c)if(!(v>a.length))for(const T of l)for(const S of g)m.push([[Ci("mit","ally",s?null:p.slice(0,v),v,{n:T,cont:S})],-1])}for(const v of Oc)if(!((_[v]??0)<=0||!r.length)){for(const T of c)if(!(T>r.length))for(const S of l)for(const E of Fl(r,T,s))m.push([[Ci("st","enemy",E,T,{st:v,n:S})],-1])}if((_.转移??0)>0&&(h.length||e.once))for(const v of c)v>a.length||m.push([[Ci("redirect","ally",s?null:p.slice(0,v),v,{})],-1]);if((_.延后??0)>0)for(const v of h)for(const T of l)2<v.start&&m.push([[{k:"delay",act:v.ord,n:T,tg:[],side:"enemy",count:1}],2]);if((_.移除??0)>0){for(const v of r){const T=n.conts.some(S=>S.uid===v.uid);(v.lis.length||v.mit>0||T)&&m.push([[{k:"remove",tg:[v.uid],tmode:"pick",side:"enemy",count:1}],-1])}for(const v of h)for(const T of v.cl)["mit","redirect"].includes(T.k)&&(T.tg??[]).length&&v.start+1<=$e&&m.push([[{k:"remove",tg:[T.tg[0]],tmode:"pick",side:"enemy",count:1}],v.start+1])}return m}function sa(i,t,e,n,s){const r=fr(n,i.caps(t).wind),a=s<0?r:Math.max(s,r);if(a>$e)return null;const o=i.buildAction(t,e,n,a);return o.err?null:o.act}const Ol=i=>i.k==="st"?i.st:i.k;function Vc(i,t){const e=[],n=[],s=r=>{if(n.length===t){e.push([...n]);return}for(let a=r;a<i;a++)n.push(a),s(a+1),n.pop()};return s(0),e}function Wc(i,t,e,n=!0){const s=i.R,r=i.caps(t),a=i.sides[t].cards,o=[];for(const u of i.declared)u.side!==t&&!o.includes(u.start)&&o.push(u.start);const l=u=>{u.ord=i.declared.length;const d=Ga(s);dr(d,[...i.declared,u],i.rnd);let p=Wa(i,d,t)-.6*u.cost;for(const g of u.cards)p-=(a[g].once?.5:.25)*a[g].v;return p+(n?i.rng.randf()*.3:0)};let c=[];for(const[u,d]of Sg(i,t,r)){const p=sa(i,t,e,u,d);p&&c.push([l(p),p])}if(c.sort((u,d)=>d[0]-u[0]),r.clauses>=2){const u=[],d=new Set;for(const g of c){const _=g[1].cl[0];_.k==="delay"||d.has(Ol(_))||u.length>=Il||(d.add(Ol(_)),u.push(g[1]))}for(const g of c){if(u.length>=Il)break;g[1].cl[0].k==="delay"||u.includes(g[1])||u.push(g[1])}for(let g=2;g<=Math.min(r.clauses,u.length);g++)for(const _ of Vc(u.length,g)){const m=[];for(const v of _)for(const T of u[v].cl)m.push(structuredClone(T));const f=sa(i,t,e,m,-1);f&&c.push([l(f),f])}const p=s.U.filter(g=>g.side!==t&&g.down===-1).sort((g,_)=>g.hp-_.hp);if(p.length)for(let g=2;g<=r.clauses;g++){const _=[];for(let f=0;f<g;f++)_.push(Ci("atk","enemy",r.late?null:[p[f%p.length].uid],1,{n:1,rep:1}));const m=sa(i,t,e,_,-1);m&&c.push([l(m),m])}}c.sort((u,d)=>d[0]-u[0]);const h=[];for(const u of c.slice(0,4)){const d=u[1];if(d.cl[0].k==="delay")continue;const p=new Set([d.ms+1]);for(const g of o)g>=d.ms&&p.add(g),g-1>=d.ms&&p.add(g-1);for(const g of p){if(g>$e||g===d.start)continue;const _={...d,start:g};h.push([l(_),_])}}return c=c.concat(h),c.sort((u,d)=>d[0]-u[0]),c}function Xc(i,t){const e=Ga(i.R);return dr(e,i.declared,i.rnd),Wa(i,e,t)}function kl(i,t){const e=Xc(i,t);let n=null,s=-1e9,r=-1,a=1e9;for(const o of i.remaining[t]){const l=Wc(i,t,o),c=l.length?l[0][0]:-1e9;l.length&&c>s&&(s=c,n=l[0][1]);const h=c-e;h<a&&(a=h,r=o)}return n===null||s-e<Gc?{uid:r!==-1?r:i.remaining[t][0],act:null}:{uid:n.uid,act:n}}function yg(i,t,e,n=3){const s=Xc(i,t),r=[],a=new Set;for(const o of Wc(i,t,e,!1)){const l=JSON.stringify(o[1].cl);if(!a.has(l)&&(a.add(l),r.push({act:o[1],gain:o[0]-s}),r.length>=n))break}return r}function $c(i,t,e){const n=i.R.U.filter(o=>o.down===-1&&o.side!==t==(e.side==="enemy")).map(o=>o.uid),s=Math.min(e.count,n.length);let r=[],a=-1e9;for(const o of Vc(n.length,s)){const l=o.map(u=>n[u]);e.tg=l;const c=Ga(i.R);dr(c,i.declared,i.rnd);const h=Wa(i,c,t);h>a&&(a=h,r=l)}return r}function Ta(i,t){const e=i.declared.filter(n=>n.side===t).sort((n,s)=>n.start!==s.start?n.start-s.start:n.ord-s.ord);for(const n of e)for(const s of n.cl)s.tmode!=="late"||s.locked||(s.tg=$c(i,t,s),s.locked=!0)}function bg(i,t,e,n){for(const s of i.declared){if(s.ord!==e)continue;const r=s.cl[n],a=[...r.tg??[]],o=$c(i,t,r);return r.tg=a,o}return[]}class Bl{constructor(t){q(this,"a");this.a=t>>>0}randf(){this.a=this.a+1831565813>>>0;let t=this.a;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}int(t,e){return t+Math.floor(this.randf()*(e-t+1))}}class sr{constructor(){q(this,"rng",new Bl(1));q(this,"rnd",0);q(this,"first0",0);q(this,"sides",[]);q(this,"R");q(this,"human",[!0,!1]);q(this,"phase","setup");q(this,"declared",[]);q(this,"remaining",[[],[]]);q(this,"passed",[[],[]]);q(this,"turn",0);q(this,"res",[{},{}]);q(this,"winner",-1);q(this,"lastEvents",[]);q(this,"roundNotes",[]);q(this,"lastDeclared",[]);q(this,"stats",[{},{}]);q(this,"opts",{})}start(t,e,n=1,s=!0,r=!1,a={}){var l,c,h,u,d,p,g;this.opts=a,this.rng=new Bl(n),this.human=[s,r],this.first0=this.rng.int(0,1),a.first!==void 0&&(this.first0=a.first),this.rnd=0,this.winner=-1,this.sides=[],this.stats=[{},{}];const o=[];for(let _=0;_<2;_++){const m=_===0?t:e;this.sides.push({cls:m.cls,ap:((l=a.ap)==null?void 0:l[_])??Cc,deck:{...m.words},used:{},prev:{},cards:[],lad:[]});for(const f of((c=a.give)==null?void 0:c[_])??[])this.sides[_].cards.push({v:f,once:!1,last:-9,src:"赠"});for(let f=0;f<3;f++){const v=!!((h=a.perma)!=null&&h.includes(_*3+f));o.push({uid:_*3+f,side:_,name:((d=(u=a.names)==null?void 0:u[_])==null?void 0:d[f])??wc[f],glyph:((g=(p=a.glyphs)==null?void 0:p[_])==null?void 0:g[f])??Ac[f],hp:v?0:m.hp[f],mx:m.hp[f],perma:v,down:v?9999:-1,st:{},kw:m.kws[f],kws:!1,mit:0,mitc:0,shield:0,msrc:[],lis:[],last:null})}}this.R=ag(o,[t.cls,e.cls]),this.beginRound()}clsOf(t){return this.sides[t].cls}progress(t){return Sa(this.R,t,this.clsOf(t))}caps(t){return ng(this.clsOf(t),this.progress(t))}firstSide(){return(this.first0+this.rnd-1)%2}stat(t,e,n=1){this.stats[t][e]=(this.stats[t][e]??0)+n}contsOf(t){return this.R.conts.filter(e=>e.side===t)}beginRound(){this.rnd++;for(const t of this.R.U)if(t.mit=0,t.mitc=0,t.msrc=[],t.lis=[],t.kws=!1,t.shield=0,t.down!==-1&&!t.perma&&this.rnd>=t.down+2)t.down=-1,t.hp=t.mx,t.st={};else if(t.down===-1)for(const e of Object.keys(t.st)){const n=t.st[e];this.rnd>n[1]?delete t.st[e]:n[0]+=1}this.roundNotes=[];for(let t=0;t<2;t++){const e=this.sides[t];this.rnd>1&&(e.ap=Math.min(e.ap+Rc,ka)),e.prev=e.used,e.used={},na[this.rnd]&&(e.cards.push({v:na[this.rnd],once:!1,last:-9,src:"保底"}),this.roundNotes.push({side:t,type:"floor",value:na[this.rnd]})),this.res[t]={ap:e.ap,words:this.availWordsBase(t),cards:[],conts:0}}this.declared=[],this.passed=[[],[]],this.remaining=[[],[]];for(const t of this.R.U)t.down===-1&&this.remaining[t.side].push(t.uid);this.turn=this.firstSide(),this.phase="declare"}availWordsBase(t){const e=this.sides[t],n={};for(const s of _a)n[s]=(e.deck[s]??0)-(e.prev[s]??0);return n}coolingWords(t){return{...this.sides[t].prev}}usableCards(t){const e=[],n=this.res[t].cards;return this.sides[t].cards.forEach((s,r)=>{n.includes(r)||(s.once||this.rnd-s.last>=2)&&e.push(r)}),e}usableValues(t){const e={};for(const n of this.usableCards(t)){const s=this.sides[t].cards[n].v;e[s]=(e[s]??0)+1}return e}pickCards(t,e){const n={};for(const o of e)o>1&&(n[o]=(n[o]??0)+1);if(!Object.keys(n).length)return[];const s=this.usableCards(t),r=this.sides[t].cards,a=[];for(const o of Object.keys(n)){const l=+o,c=s.filter(h=>r[h].v===l&&!a.includes(h));if(c.sort((h,u)=>(r[h].once?1:0)-(r[u].once?1:0)),c.length<n[l])return null;for(let h=0;h<n[l];h++)a.push(c[h])}return a}bloodRoom(t,e){const n=this.caps(t);return n.blood<=0?0:Math.max(0,Math.min(n.blood,this.R.U[e].hp-1))}declareSide(){return this.phase!=="declare"||!this.remaining[0].length&&!this.remaining[1].length?-1:this.remaining[this.turn].length?this.turn:1-this.turn}publicDeclared(t){return this.declared.filter(e=>e.side===t)}buildAction(t,e,n,s){if(!n.length)return{err:"这句话是空的"};const r=this.caps(t);if(n.length>r.clauses)return{err:`一句最多 ${r.clauses} 段`};const a=this.R.U[e];if(a.side!==t||a.down!==-1)return{err:"这个随从现在不能出手"};const o=gg(n,r);if(o)return{err:o};const l=Ha(n),c={};for(const m of l)c[m]=(c[m]??0)+1;for(const m in c)if((this.res[t].words[m]??0)<c[m])return{err:`【${m}】不够用（卡组里的张数用完了，或者在冷却）`};const h=Va(n,r.and);let u=0;if(h>this.res[t].ap){if(u=h-this.res[t].ap,r.blood<=0)return{err:`行动点不够（要 ${h}，还剩 ${this.res[t].ap}）`};if(u>this.bloodRoom(t,e))return{err:`行动点不够，用血也付不起（差 ${u}，这个随从最多能付 ${this.bloodRoom(t,e)} 血）`};for(const m of n){if(r.noheal&&m.k==="heal")return{err:"用血付的句子里不能有【恢复】"};if(r.nodef&&["mit","redirect"].includes(m.k))return{err:"用血付的句子里不能有【减伤】【转移】"}}}const d=Ks(n);if(d>0){if(r.slots<=0)return{err:"只有续流能把【持续】接在伤害、恢复、减伤后面"};if(this.contsOf(t).length+this.res[t].conts+d>r.slots)return{err:`续挂满了（同时最多 ${r.slots} 个）`}}const p=Bc(n,r.freecount),g=this.pickCards(t,p);if(g===null)return{err:`数字牌不够：这句要用 [${p.join(", ")}]`};const _=fr(n,r.wind);if(s<_)return{err:`这句最早第 ${_} 秒才能起效`};if(s>$e)return{err:`时间轴只有 ${$e} 秒`};for(const m of n)if(m.tmode!=="late"){for(const f of m.tg??[])if(this.R.U[f].down!==-1)return{err:"目标已经倒下了"};if(m.k==="delay"&&!this.declared.some(f=>f.ord===m.act&&f.side!==t))return{err:"延后要选对方已经宣告的一句"}}return{act:{side:t,uid:e,start:s,cl:n,cost:h,blood:u,cards:g,words:l,def:mg(n),ms:_,cv:p,ord:this.declared.length}}}submit(t,e,n){if(this.declareSide()!==t)return"还没轮到你";if(!this.remaining[t].includes(e))return"这个随从这一轮已经定过了";if(n){n.ord=this.declared.length,this.declared.push(n),this.res[t].ap-=Math.min(n.cost,this.res[t].ap);for(const s of n.words)this.res[t].words[s]=(this.res[t].words[s]??0)-1;for(const s of n.cards)this.res[t].cards.push(s);this.res[t].conts+=Ks(n.cl)}else this.passed[t].push(e);return this.remaining[t].splice(this.remaining[t].indexOf(e),1),this.turn=1-t,!this.remaining[0].length&&!this.remaining[1].length&&this.afterDeclare(),""}pendingLate(t){const e=[];for(const n of this.declared)n.side===t&&n.cl.forEach((s,r)=>{s.tmode==="late"&&!s.locked&&e.push({ord:n.ord,ci:r,cl:s})});return e}afterDeclare(){for(let t=0;t<2;t++)!this.human[t]&&this.clsOf(t)==="择"&&Ta(this,t);for(let t=0;t<2;t++)this.human[t]&&this.clsOf(t)==="择"&&this.pendingLate(t).length&&(this.phase="assign")}setLate(t,e,n){for(const s of this.declared)s.ord===t&&(s.cl[e].tg=[...n],s.cl[e].locked=!0)}finishAssign(){this.phase==="assign"&&(this.phase="declare")}aiStep(){const t=this.declareSide();if(t===-1||this.human[t])return;const e=kl(this,t);this.submit(t,e.uid,e.act)}resolveRound(){const t=this.R;t.kos=[0,0],t.lost=[0,0],t.fz=[0,0],t.maxhit=0,t.eff={},t.retarget=[0,0],t.ev=[],dr(t,this.declared,this.rnd),this.lastEvents=t.ev,t.ev=null,this.lastDeclared=[...this.declared];const e=[0,0];for(const r of this.declared){const a=r.side,o=this.sides[a];o.ap-=Math.min(r.cost,o.ap),e[a]+=r.blood??0,(r.blood??0)>0&&(this.stat(a,"血句"),this.stat(a,"血付",r.blood)),Ks(r.cl)>0&&this.stat(a,"续句"),r.cl.length>Lc&&this.stat(a,"超长句");for(const l of r.cl)l.tmode==="late"&&this.stat(a,"待定段");for(const l of r.words)o.used[l]=(o.used[l]??0)+1;for(const l of r.cards){const c=o.cards[l];c.once?c.gone=!0:c.last=this.rnd}}for(let r=0;r<2;r++)t.retarget[r]>0&&this.stat(r,"择换人",t.retarget[r]);for(let r=0;r<2;r++)this.sides[r].cards=this.sides[r].cards.filter(a=>!a.gone);for(let r=0;r<2;r++){const a=this.sides[r],o=t.lost[r]+e[r];if(o>=Ic||t.kos[r]>0){const c=[];for(let h=0;h<Q0;h++){const u=this.rng.int(1,6);c.push(u),u>1&&a.cards.push({v:u,once:!0,last:-9,src:"骰子"})}this.roundNotes.push({side:r,type:"dice",rolls:c,why:t.kos[r]>0?"有随从倒下":`这一轮掉了 ${o} 点血`})}const l=this.progress(r);Z0.forEach((c,h)=>{if(l>=c&&!a.lad.includes(h)){a.lad.push(h);for(let u=0;u<Al;u++)a.cards.push({v:wl[h],once:!1,last:-9,src:"阶梯"});this.roundNotes.push({side:r,type:"ladder",value:wl[h],copies:Al,at:c})}})}const n=this.progress(0),s=this.progress(1);if(this.opts.koWin){const r=[0,1].map(a=>this.R.U.filter(o=>o.side===a).every(o=>o.down!==-1));r[0]||r[1]?this.winner=r[0]&&r[1]?-2:r[0]?1:0:this.opts.maxRounds&&this.rnd>=this.opts.maxRounds&&(this.winner=1)}else(n>=1||s>=1||this.rnd>=za)&&(this.winner=n>s?0:s>n?1:-2);return this.phase=this.winner!==-1?"over":"resolved",this.lastEvents}nextRound(){this.phase==="resolved"&&this.beginRound()}runToEnd(t=2e3){let e=0;for(;this.phase!=="over"&&e++<t;)if(this.phase==="declare"){const n=this.declareSide();if(n===-1)this.resolveRound();else{const s=kl(this,n);this.submit(n,s.uid,s.act)}}else if(this.phase==="assign"){for(let n=0;n<2;n++)this.clsOf(n)==="择"&&Ta(this,n);this.finishAssign()}else this.phase==="resolved"&&this.nextRound()}}const ra={atk:i=>String(i.n*(i.rep??1)),heal:i=>String(i.n*(i.rep??1)),mit:i=>String(i.n),st:i=>i.st[0],redirect:()=>"",delay:i=>`+${i.n}`,remove:()=>""};function qc(i,t){var s;const e=i.R.U[t],n={atk:0,block:0,heal:0,redirect:!1,delay:0,blood:0,bloodRoom:7,conts:0,contLeft:0,clauses:[],statuses:[]};if(e.down!==-1)return n.down=!0,n;for(const r of i.declared)if(r.uid===t){n.blood+=r.blood??0;for(const a of r.cl){const o=a.count??(a.tg??[]).length??1;a.k==="atk"&&(n.atk+=a.n*(a.rep??1)*Math.max(1,o)),a.k==="mit"&&(n.block+=a.n),a.k==="heal"&&(n.heal+=a.n*(a.rep??1)),a.k==="redirect"&&(n.redirect=!0),a.k==="delay"&&(n.delay+=a.n),n.clauses.push({kind:a.k,label:((s=ra[a.k])==null?void 0:s.call(ra,a))??""})}}for(const r of i.R.conts)r.uid===t&&(n.conts++,n.contLeft=Math.max(n.contLeft,r.left));for(const r of Object.keys(e.st))n.statuses.push({name:r,lv:e.st[r][0]});return n.kw=e.kw,n.kwSpent=!!e.kws,n.bloodRoom=Math.max(1,e.hp),n}const Tg=["一","二","三"],Ze=i=>i<3?3+i:i-3,Eg=i=>(i<3?"蓝":"红")+Tg[i%3];let Js=null;const l_=i=>{Js=i};function wi(i,t,e,n){const s=[{k:"word",w:"选择"}],r=t.side==="enemy"?1-e:e;if(t.tmode==="late"&&n!==e&&!t.shown)return s.push({k:"word",w:"一个"},{k:"side",side:r===0?"b":"r"},{k:"word",w:"随从"},{k:"word",w:"待定"}),s;s.push({k:"side",side:r===0?"b":"r"},{k:"word",w:"随从"});for(const a of t.tg??[])s.push({k:"unit",name:(Js==null?void 0:Js(i,a))??Eg(a),side:a<3?"b":"r"});return s}function wg(i,t,e,n=0){const s=[];switch(t.k){case"atk":s.push(...wi(i,t,e,n),{k:"word",w:"造成"},{k:"num",v:t.n},{k:"word",w:"伤害"}),(t.rep??1)>1&&s.push({k:"word",w:"重复"},{k:"num",v:t.rep});break;case"heal":s.push(...wi(i,t,e,n),{k:"word",w:"恢复"},{k:"num",v:t.n});break;case"mit":s.push(...wi(i,t,e,n),{k:"word",w:"减少"},{k:"word",w:"伤害"},{k:"num",v:t.n});break;case"st":s.push(...wi(i,t,e,n),{k:"word",w:"施加"},{k:"word",w:t.st});break;case"redirect":s.push(...wi(i,t,e,n),{k:"word",w:"转为"},{k:"word",w:"自身"});break;case"delay":s.push({k:"word",w:"延后"},{k:"num",v:t.n});break;case"remove":s.push(...wi(i,t,e,n),{k:"word",w:"移除"});break}return(t.cont??1)>1&&s.push({k:"word",w:"持续"},{k:"num",v:t.cont}),s}function rr(i,t,e=0){const n=[];return t.cl.forEach((s,r)=>{r>0&&n.push({k:"word",w:"并"}),n.push(...wg(i,s,t.side,e))}),n}class c_{constructor(t){q(this,"M",new sr);q(this,"timer",0);q(this,"busy",!1);q(this,"seed",1);this.ctx=t}begin(t,e){var a,o;const n=["并","续","择","血"],s=t??n[Math.floor(Math.random()*4)],r=e??n[Math.floor(Math.random()*4)];this.seed=Math.floor(Math.random()*1e6),this.M=new sr,this.M.start(xa(s),xa(r),this.seed,!1,!1),(o=(a=this.ctx).say)==null||o.call(a,`第 1 轮：蓝方 ${s}流 对 红方 ${r}流`),this.syncAll(!0)}start(){this.timer||(this.timer=window.setInterval(()=>this.tick(),1100))}stop(){clearInterval(this.timer),this.timer=0}get running(){return!!this.timer}syncAll(t){var n,s;const e=this.M;for(const r of e.R.U){const a=this.ctx.cards[Ze(r.uid)];a.syncHp(r.hp,r.mx),a.setLoadout(qc(e,r.uid)),t&&this.ctx.panels[Ze(r.uid)].set([],null)}(s=(n=this.ctx).onChange)==null||s.call(n)}tick(){var e,n;if(this.busy)return;const t=this.M;if(t.phase==="over"){this.stop();return}if(t.phase==="declare"){if(t.declareSide()===-1){this.resolve();return}const r=t.declared.length;if(t.aiStep(),t.declared.length>r){const a=t.declared[t.declared.length-1];this.ctx.panels[Ze(a.uid)].set(rr(t,a,0),a.start,!0)}this.syncAll(!1)}else t.phase==="assign"?t.runToEnd(1):t.phase==="resolved"&&(t.nextRound(),(n=(e=this.ctx).say)==null||n.call(e,`第 ${t.rnd} 轮`),this.syncAll(!0))}resolve(){const t=this.M;this.busy=!0;const e=[...t.declared],n=t.resolveRound(),s=this.ctx.cast;if(s){s.playRound({M:t,events:n,decl:e,alive:()=>!0,fast:()=>!1,step:a=>{a.type==="hit"&&a.dealt>0&&this.ctx.cards[Ze(a.tgt)].hit(0)}}).then(()=>{var a,o,l,c;this.syncAll(!1),(o=(a=this.ctx).say)==null||o.call(a,`完成度 蓝 ${(t.progress(0)*100).toFixed(0)}% · 红 ${(t.progress(1)*100).toFixed(0)}%`),t.phase==="over"&&((c=(l=this.ctx).say)==null||c.call(l,t.winner===-2?"平局":`${["蓝","红"][t.winner]}方获胜`)),this.busy=!1});return}let r=0;for(const a of n)if(a.type==="hit"&&a.dealt>0){const o=this.ctx.cards[Ze(a.tgt)];setTimeout(()=>o.hit(0),120*r++)}setTimeout(()=>{var o,l,c,h;this.syncAll(!1);const a=["蓝","红"];(l=(o=this.ctx).say)==null||l.call(o,`完成度 蓝 ${(t.progress(0)*100).toFixed(0)}% · 红 ${(t.progress(1)*100).toFixed(0)}%`),t.phase==="over"&&((h=(c=this.ctx).say)==null||h.call(c,t.winner===-2?"平局":`${a[t.winner]}方获胜`)),this.busy=!1},120*r+700)}}function Xa(i,t){if(!i)return"某某";const e=i.R.U[t];return(e.side===0?"你的":"对手的")+e.name}function Ag(i,t,e=0,n=0){const s=t.tg??[],r=t.tmode??"choose";if(r==="self")return"自身";const a=t.count??s.length,o=(t.side??"enemy")==="enemy"?"敌方":"友方",l=t.count!==void 0&&a>0?`${a} 个`:"几个";return r==="late"&&(!s.length||i&&e!==n&&!t.shown)?`${l}${o}随从（待定：宣告完再定）`:s.length&&i?s.map(c=>Xa(i,c)).join("、"):`${l}${o}随从`}const Xs=(i,t)=>i[t]!==void 0?String(i[t]):"几";function us(i,t,e=0,n=0){const s=Ag(i,t,e,n),r=t.cont??1,a=r>1?`，以后每轮同一秒再来一次（共 ${r} 轮）`:"";switch(t.k){case"atk":return`对${s}造成 ${Xs(t,"n")} 点伤害${(t.rep??1)>1?`，一共打 ${t.rep} 次`:""}${a}`;case"heal":return`使${s}恢复 ${Xs(t,"n")} 点生命${(t.rep??1)>1?`，一共 ${t.rep} 次`:""}${a}`;case"mit":return`本轮${s}每次受到的伤害少 ${Xs(t,"n")} 点${a}`;case"st":{const o=t.n??1;return`给${s}施加【${t.st??"某个状态"}】${o>1?`（持续 ${o} 轮，每过一轮 +1 级）`:"（只撑本轮）"}`}case"redirect":return`本轮打向${s}的敌方伤害，转给出手的人`;case"delay":{let o="";if(i&&(t.act??-1)>=0)for(const l of i.declared)l.ord===t.act&&(o=`（${Xa(i,l.uid)} 第 ${l.start} 秒那句）`);return`把对方的一句${o}往后推 ${Xs(t,"n")} 秒`}case"remove":return`拆掉${(t.tg??[]).length?s:"一个敌人"}身上的减伤、转移，掐断它的续`}return"……"}const Qi=(i,t,e=0,n=0)=>t.map(s=>us(i,s,e,n)).join("；并且"),Cg=(i,t,e)=>`${i}${t[0]}级·剩${Math.max(t[1]-e+1,0)}轮`,Rg={选择:"选几个目标：后面放一张数字牌（几个），再说敌方还是友方",自身:"目标是出手的这个随从自己",敌方:"对方的随从",友方:"自己这边的随从",造成:"打伤害：后面放数字牌（几点）",恢复:"回血：后面放数字牌（几点）",减伤:"本轮每次少受几点伤害：后面放数字牌",持续:"撑几轮：后面放数字牌",重复:"再来几次：后面放数字牌（一共几次）",并:"接着说下一段"},Pg={count:"选几个目标？放一张数字牌：1 免费；2、3 要用手里的牌。",side:"选敌方还是友方？",action:"要做什么？（对敌方：造成伤害，或者直接放一个状态词；对友方：恢复、减伤、转移）",atk_n:"打几点？放一张数字牌。",heal_n:"回几点血？放一张数字牌。",mit_n:"本轮每次少受几点？放一张数字牌。",rep_n:"一共打几次？放一张数字牌。",dur_n:"持续几轮？放一张数字牌。",delay_n:`往后推几秒？放一张数字牌。推出第 ${$e} 秒就落空。`},zl=i=>{const t={...i};return delete t.rep_set,delete t.dur_set,t.tg||(t.tg=[]),t};class Lg{constructor(t,e,n=0,s){q(this,"tokens",[]);q(this,"cp");q(this,"sugg",null);q(this,"allow",null);this.M=t,this.uid=e,this.side=n,this.cp=t.caps(n),s&&(this.allow=new Set(s))}parse(t=this.tokens){const e=[];let n=null,s="start";const r=[],a=!!this.cp.late;for(const c of t){let h="";const u=c.t==="w"?String(c.v):"",d=c.t==="n"?Number(c.v):0;switch(s){case"start":if(u==="选择")n={tmode:a?"late":"choose"},s="count";else if(u==="自身")n={tmode:"self",side:"ally",count:1},s="action",h="，";else if(u==="延后")n={k:"delay",act:-1,tg:[]},s="delay_n";else if(u==="移除")n={k:"remove",tmode:"pick",side:"enemy",count:1,tg:[]},s="end",h="一个敌人身上的保护";else return{err:"这里要以【选择】【自身】【延后】【移除】开头",clauses:[],done:[],cur:null,expect:s,complete:!1,glue:r};break;case"count":n.count=d,s="side",h="个";break;case"side":n.side=u==="敌方"?"enemy":"ally",s="action",h="随从，";break;case"action":switch(u){case"造成":n.k="atk",s="atk_n";break;case"恢复":n.k="heal",s="heal_n";break;case"减伤":n.k="mit",s="mit_n";break;case"易伤":case"灼烧":case"衰弱":n.k="st",n.st=u,n.n=1,s="end",h="（状态）";break;case"转移":n.k="redirect",s="end";break}break;case"atk_n":n.n=d,n.rep=1,s="end",h="点伤害";break;case"heal_n":n.n=d,n.rep=1,s="end",h="点生命";break;case"mit_n":n.n=d,s="end",h="点";break;case"rep_n":n.rep=d,n.rep_set=!0,s="end",h="次";break;case"dur_n":n.k==="st"?n.n=d:n.cont=d,n.dur_set=!0,s="end",h="轮";break;case"delay_n":n.n=d,s="end",h="秒";break;case"end":u==="重复"?s="rep_n":u==="持续"?s="dur_n":u==="并"&&(e.push(zl(n)),n=null,s="start");break}r.push(h)}const o=n!==null&&s==="end",l=[...e];return o&&l.push(zl(n)),{clauses:l,done:e,cur:n,expect:s,complete:o,glue:r}}usedValues(){const t={};for(const e of this.tokens)e.t==="n"&&Number(e.v)>1&&!e.free&&(t[+e.v]=(t[+e.v]??0)+1);return t}usedWords(){const t={};for(const e of this.tokens)e.t==="w"&&vn[String(e.v)]&&(t[String(e.v)]=(t[String(e.v)]??0)+1);return t}wordLeft(t){return(this.M.res[this.side].words[t]??0)-(this.usedWords()[t]??0)}alive(t){return this.M.R.U.filter(e=>e.down===-1&&e.side!==this.side==(t==="enemy")).length}enemyDeclared(){return this.M.declared.some(t=>t.side!==this.side)}contRoom(){return this.cp.slots-this.M.contsOf(this.side).length-this.M.res[this.side].conts}options(){const t=this.parse(),e=t.expect,n=t.cur;let s=[],r=!1;const a=t.done.length,o=this.cp;switch(e){case"start":{const c=this.wordLeft("延后")>0&&this.enemyDeclared();s=[{w:"选择",ok:!0,why:""},{w:"自身",ok:!0,why:""},{w:"延后",ok:c,why:c?"":"要卡组里有【延后】，并且对手已经宣告过"},{w:"移除",ok:this.wordLeft("移除")>0,why:this.wordLeft("移除")>0?"":"卡组里的【移除】用完了或在冷却"}];break}case"count":case"atk_n":case"heal_n":case"mit_n":case"rep_n":case"dur_n":case"delay_n":r=!0;break;case"side":{const c=n.count??1,h=this.alive("enemy"),u=this.alive("ally"),d=n.tmode==="late";s=[{w:"敌方",ok:h>=c||d,why:h>=c?"":`对面只剩 ${h} 个随从`},{w:"友方",ok:u>=c||d,why:u>=c?"":`你只剩 ${u} 个随从`}];break}case"action":if((n.side??"enemy")==="enemy"){s=[{w:"造成",ok:!0,why:""}];for(const c of Oc)s.push({w:c,ok:this.wordLeft(c)>0,why:this.wordLeft(c)>0?"":`卡组里的【${c}】用完了或在冷却`})}else s=[{w:"恢复",ok:!0,why:""},{w:"减伤",ok:!0,why:""},{w:"造成",ok:!0,why:"（打自己人）"},{w:"转移",ok:this.wordLeft("转移")>0,why:this.wordLeft("转移")>0?"":"【转移】用完了或在冷却"}];break;case"end":{const c=n.k;if(["atk","heal"].includes(c)&&!n.rep_set&&s.push({w:"重复",ok:!0,why:""}),!n.dur_set){if(c==="st")s.push({w:"持续",ok:!0,why:""});else if(["atk","heal","mit"].includes(c)&&o.slots>0){const h=this.contRoom();s.push({w:"持续",ok:h>0,why:h>0?"":`续挂满了（同时最多 ${o.slots} 个）`})}}break}}if(e==="end"&&a+1<o.clauses){let c=!0,h="";if(o.cont_single){let u=(n.cont??1)>1||n.dur_set&&n.k!=="st";for(const d of t.done)(d.cont??1)>1&&(u=!0);u&&(c=!1,h="续流：带【持续】的句子只能一段")}s.push({w:"并",ok:c,why:h})}const l=new Set(t.done.map(c=>zc(c)));for(const c of s)o.once&&l.has(c.w)&&c.ok&&(c.ok=!1,c.why=`并流：一句里【${c.w}】只能用一次`),c.w==="重复"&&o.norep&&(c.ok=!1,c.why="择流：句子里不能用【重复】"),c.w==="持续"&&o.cont_single&&a>0&&(n==null?void 0:n.k)!=="st"&&(c.ok=!1,c.why="续流：带【持续】的句子只能一段");return this.allow&&(s=s.filter(c=>this.allow.has(c.w))),{words:s,num:r,parsed:t}}freeCount(){return this.cp.freecount&&this.parse().expect==="count"}draftText(t=this.tokens){const e=this.parse(t);if(e.err)return e.err;const n=e.done.map(r=>us(this.M,r)),s=e.cur;if(s){const r={...s};if(r.k){let a=us(this.M,r);e.expect==="rep_n"&&(a+="，一共 几 次"),e.expect==="dur_n"&&(a+=r.k==="st"?"，持续 几 轮":"，以后每轮同一秒再来一次（共 几 轮）"),n.push(a)}else{let a=r.tmode==="self"?"自身":`${r.count!==void 0?`${r.count} 个`:"几个"}${r.side?r.side==="enemy"?"敌方":"友方":"某方"}随从`;r.tmode==="late"&&r.side&&(a+="（待定）"),n.push(`对${a}……`)}}return n.join("；并且")||"（空）"}previewWith(t){const e=[...this.tokens,t],n=this.parse(e);return this.draftText(e)+(n.complete?"。（到这里就能拼好）":"")}addWord(t){const e=this.options().words.find(n=>n.w===t);return!e||!e.ok?!1:(this.tokens.push({t:"w",v:t}),!0)}addNumber(t){if(!this.options().num)return!1;const n=this.freeCount();if(t>1&&!n){const s=this.M.usableValues(this.side)[t]??0;if((this.usedValues()[t]??0)>=s)return!1}return this.tokens.push({t:"n",v:t,free:n}),!0}undo(){this.tokens.pop()}clear(){this.tokens=[]}finish(){const t=this.parse();if(!t.complete)return null;const e=structuredClone(t.clauses);return this.sugg&&JSON.stringify(this.sugg.tokens)===JSON.stringify(this.tokens)&&e.length===this.sugg.act.cl.length&&(e.forEach((n,s)=>{const r=this.sugg.act.cl[s];r.tmode==="choose"&&(r.tg??[]).length&&(n.tg=[...r.tg],n.pre=!0),r.k==="delay"&&(n.act=r.act)}),e[0].sugg_start=this.sugg.act.start),e}costInfo(){const t=this.parse();if(!t.complete)return{text:"拼完整之后才能用。",bad:!0,allLate:!1};const e=t.clauses,n=this.cp,s=Va(e,n.and),r=fr(e,n.wind),a=this.M.res[this.side].ap,o=Math.max(0,s-a),l=Bc(e,n.freecount);let c=`花 ${s} 行动点（还剩 ${a}）· 最早第 ${r} 秒起效 · 用数字牌 ${l.length?`[${l.join(", ")}]`:"无（全是 1）"}`,h=!1;o>0&&(n.blood>0?e.some(p=>n.noheal&&p.k==="heal"||n.nodef&&["mit","redirect"].includes(p.k))?(c+="  —— 行动点不够要用血付；用血付的句子不能有【恢复】【减伤】【转移】",h=!0):o>this.M.bloodRoom(this.side,this.uid)?(c+=`  —— 差 ${o} 点，这个随从最多只能付 ${this.M.bloodRoom(this.side,this.uid)} 血`,h=!0):c+=`  —— 差的 ${o} 点用【${this.M.R.U[this.uid].name}】的生命付`:(c+="  —— 行动点不够",h=!0));const u=e.every(d=>["late","self"].includes(d.tmode??"")||d.k==="delay");return{text:c,bad:h,allLate:u}}help(){var n;const t=this.parse(),e=t.expect;if(e==="start"){let s="第一张：【选择】几个目标 / 【自身】 / 【延后】对方的一句 / 【移除】敌人的保护。";return this.cp.late&&(s+=" 择流：选择的目标现在不用定，双方宣告完你再定（对手只看到“待定”）。"),s}if(e==="end"){const s=["可以拼好了"];for(const r of this.options().words)r.w==="重复"?s.push("接【重复】多打几次"):r.w==="持续"?s.push(((n=t.cur)==null?void 0:n.k)==="st"?"接【持续】让它多撑几轮":"接【持续】让它以后每轮自动再来"):r.w==="并"&&s.push("【并】接下一段");return s.join("；也可以")+"。"}return Pg[e]??""}}function Dg(i){const t=[],e=s=>t.push({t:"w",v:s}),n=s=>t.push({t:"n",v:s});if(i.k==="delay")return e("延后"),n(i.n),t;if(i.k==="remove")return e("移除"),t;switch(i.tmode==="self"?e("自身"):(e("选择"),n(i.count??1),e((i.side??"enemy")==="enemy"?"敌方":"友方")),i.k){case"atk":e("造成"),n(i.n);break;case"heal":e("恢复"),n(i.n);break;case"mit":e("减伤"),n(i.n);break;case"st":e(i.st),i.n>1&&(e("持续"),n(i.n));break;case"redirect":e("转移");break}return["atk","heal"].includes(i.k)&&(i.rep??1)>1&&(e("重复"),n(i.rep)),(i.cont??1)>1&&(e("持续"),n(i.cont)),t}function Ig(i){const t=[];return i.forEach((e,n)=>{n>0&&t.push({t:"w",v:"并"}),t.push(...Dg(e))}),t}const Gl=["①","②","③","④","⑤","⑥","⑦","⑧"],Cn=i=>Gl[Math.min(i,Gl.length-1)],Hl=i=>new Promise(t=>setTimeout(t,i)),Ug=i=>i>=3?i-3:i+3;function nt(i,t="",e=""){const n=document.createElement(i);return t&&(n.className=t),e&&(n.textContent=e),n}function Jt(i,t="",e){const n=nt("button",t,i);return e&&n.addEventListener("click",e),n}const Vl={cls:"并",words:{...ei.并.words},kws:[...ei.并.kws],hp:[7,7,7],foe:"随机"};class h_{constructor(t){q(this,"active",!1);q(this,"foeName","电脑");q(this,"hooks",null);q(this,"hlCards",[]);q(this,"M",new sr);q(this,"ui","idle");q(this,"S",structuredClone(Vl));q(this,"root",nt("aside","gm"));q(this,"elTop",nt("div","gm-top"));q(this,"elUnits",nt("div","gm-units"));q(this,"elHand",nt("div","gm-hand"));q(this,"elAct",nt("div","gm-act"));q(this,"elDecl",nt("div","gm-decl"));q(this,"elLog",nt("div","gm-log"));q(this,"overlay",nt("div","gm-overlay"));q(this,"selUid",-1);q(this,"pending",[]);q(this,"pendI",0);q(this,"cmp",null);q(this,"shown",{});q(this,"latePick",[]);q(this,"fast",!1);q(this,"token",0);this.ctx=t,this.root.append(this.elTop,this.elUnits,this.elHand,this.elAct,this.elDecl,this.elLog),this.root.hidden=!0,this.overlay.hidden=!0,document.body.append(this.root,this.overlay);try{const e=localStorage.getItem("nc-settings");e&&(this.S={...Vl,...JSON.parse(e)})}catch{}}open(){this.hooks=null,this.active=!0,document.body.classList.add("game"),this.root.hidden=!1,this.ctx.onToggle(!0),this.showSetup()}startLevel(t,e){this.hooks=e,this.active=!0,document.body.classList.add("game"),this.root.hidden=!1,this.overlay.hidden=!0,this.ctx.onToggle(!0),this.M=t,this.token++,this.ui="idle",this.fast=!1,this.elLog.innerHTML="",this.refreshAll(!0),this.roundBegin()}roundBegin(){const t=this.hooks;t!=null&&t.roundStart?t.roundStart(this.M,()=>{this.refreshAll(!0),this.step()}):this.step()}clickInfo(t,e={}){var s;const n=this.pending[this.pendI];return{kind:t,stage:this.ui,tokens:((s=this.cmp)==null?void 0:s.tokens.length)??0,clause:this.pendI,picked:n!=null&&n.tg?[...n.tg]:[],latePick:[...this.latePick],...e}}gate(t,e={}){var s,r;const n=(r=(s=this.hooks)==null?void 0:s.before)==null?void 0:r.call(s,this.clickInfo(t,e));return n?(this.toast(n),!1):!0}hl(t,e,n){var r,a;const s=(a=(r=this.hooks)==null?void 0:r.expect)==null?void 0:a.call(r,this.clickInfo(t));return!!s&&s.kind===t&&(e===void 0||s.value===e)&&(n===void 0||s.uid===n)}hlKind(t){var e,n,s;return((s=(n=(e=this.hooks)==null?void 0:e.expect)==null?void 0:n.call(e,this.clickInfo(t)))==null?void 0:s.kind)===t}close(){this.token++,this.active=!1,document.body.classList.remove("game"),this.root.hidden=!0,this.overlay.hidden=!0,this.ctx.cards.forEach(t=>t.setSelected(!1)),this.ctx.onToggle(!1)}save(){try{localStorage.setItem("nc-settings",JSON.stringify(this.S))}catch{}}showSetup(){const t=this.overlay;t.hidden=!1,t.innerHTML="";const e=this.S,n=nt("div","gm-modal wide");n.append(nt("h2","","数字牌模式 · 开局"));const s=()=>{n.querySelectorAll(".sec").forEach(f=>f.remove());const r=nt("section","sec");r.append(nt("h3","","1 · 选职业"));const a=nt("div","cls-row");for(const f of ea){const v=nt("button","cls"+(e.cls===f?" on":""));v.style.setProperty("--c",ia[f]),v.innerHTML=`<b>${Ai[f]}</b><small>${Ys[f]}</small><em>得分：${Ma[f]}（目标 ${ls[f]}）</em>`,v.addEventListener("click",()=>{e.cls=f,e.words={...ei[f].words},e.kws=[...ei[f].kws],s()}),a.append(v)}r.append(a);const o=nt("section","sec"),l=_a.reduce((f,v)=>f+(e.words[v]??0),0);o.append(nt("h3","",`2 · 进阶词卡组（${l}/${cs} 张，同名最多 ${hs} 张）`));const c=nt("div","deck");for(const f of _a){const v=vn[f],T=e.words[f]??0,S=nt("div","dw");S.append(nt("b","",f),nt("small","",`价 ${v.price} · ${v.desc}`));const E=nt("span","ctl");E.append(Jt("−","",()=>{T>0&&(e.words[f]=T-1,s())}),nt("i","",String(T)),Jt("+","",()=>{T<hs&&l<cs&&(e.words[f]=T+1,s())})),S.append(E),c.append(S)}o.append(c,Jt("用这个职业的建议卡组","ghost",()=>{e.words={...ei[e.cls].words},e.kws=[...ei[e.cls].kws],s()}));const h=nt("section","sec");h.append(nt("h3","","3 · 每个随从的关键词和生命（总共 21 点，每个至少 3）"));const u=nt("div","units3");for(let f=0;f<3;f++){const v=nt("div","u3");v.append(nt("b","",`${Ac[f]} ${wc[f]}`));const T=nt("select");for(const y of Object.keys(va)){const R=nt("option","",`${y}：${va[y]}`);R.value=y,e.kws[f]===y&&(R.selected=!0),T.append(R)}T.addEventListener("change",()=>{e.kws[f]=T.value});const S=nt("span","ctl"),E=y=>{const R=(f+1)%3;e.hp[f]+y<ir||e.hp[R]-y<ir||(e.hp[f]+=y,e.hp[R]-=y,s())};S.append(Jt("−","",()=>E(-1)),nt("i","",`${e.hp[f]} 血`),Jt("+","",()=>E(1))),v.append(T,S),u.append(v)}h.append(u);const d=nt("section","sec");d.append(nt("h3","","4 · 对手（电脑）的职业"));const p=nt("div","foe-row");for(const f of["随机",...ea])p.append(Jt(f==="随机"?"随机":Ai[f],e.foe===f?"on":"",()=>{e.foe=f,s()}));d.append(p);const g=ig(e.words,e.kws)||rg(e.hp),_=nt("div","foot");_.append(nt("span","err",g),Jt("怎么玩","ghost",()=>this.showRules()),Jt("退出对局模式","ghost",()=>{this.overlay.hidden=!0,this.close()}));const m=Jt("开始对局 →","primary",()=>this.begin());m.disabled=!!g,_.append(m),n.append(r,o,h,d,_)};s(),t.append(n)}showRules(){const t=nt("div","gm-modal");t.append(nt("h2","","数字牌模式 · 怎么玩"));for(const n of sg)t.append(nt("p","",n));this.overlay.innerHTML,this.overlay.hidden;const e=nt("div","gm-overlay top");e.append(t),t.append(Jt("知道了","primary",()=>{e.remove()})),e.addEventListener("click",n=>{n.target===e&&e.remove()}),document.body.append(e)}begin(){const t=this.S;this.save(),this.overlay.hidden=!0;const e=t.foe==="随机"?ea[Math.floor(Math.random()*4)]:t.foe,n={cls:t.cls,words:{...t.words},kws:[...t.kws],hp:[...t.hp]},s=xa(e);this.M=new sr,this.M.start(n,s,Math.floor(Math.random()*1e9),!0,!1),this.token++,this.ui="idle",this.elLog.innerHTML="",this.log(`对局开始：你 ${Ai[t.cls]} 对 电脑 ${Ai[e]}`),this.refreshAll(!0),this.step()}setUi(t){this.ui=t,this.highlight()}refreshAll(t=!1){const e=this.M;if(t){this.shown={};for(const n of e.R.U)this.shown[n.uid]=[n.hp,n.down!==-1]}this.renderTop(),this.renderUnits(),this.renderHand(),this.renderDecl(),this.syncCards()}syncCards(){const t=this.M;for(const e of t.R.U){if(e.perma)continue;const n=this.ctx.cards[Ze(e.uid)],s=this.shown[e.uid]??[e.hp,e.down!==-1];n.syncHp(s[1]?0:s[0],e.mx),n.setLoadout(qc(t,e.uid));const r=this.ctx.panels[Ze(e.uid)],o=(t.phase==="declare"||t.phase==="assign"?t.declared:t.lastDeclared).find(l=>l.uid===e.uid);o?r.set(rr(t,o,0),o.start):r.set([],null)}this.ctx.onChange()}highlight(){var n;const t=this.M;this.hlCards=[];const e=(n=this.hooks)!=null&&n.expect?this.hooks.expect(this.clickInfo("unit")):null;this.ctx.cards.forEach((s,r)=>{var l,c;const a=Ug(r);let o=!1;this.ui==="pick_unit"?o=a<3&&t.remaining[0].includes(a):this.ui==="target"?o=this.targetOk(a):this.ui==="assign"&&(o=this.lateOk(a)),(l=this.hooks)!=null&&l.expect&&o&&e&&e.uid!==void 0&&["unit","pass","target","late"].includes(e.kind)?o=e.uid===a:(c=this.hooks)!=null&&c.expect&&e&&!["unit","pass","target","late"].includes(e.kind)&&(o=!1),o&&e&&e.uid===a&&this.hlCards.push(a),s.setSelected(o)})}renderTop(){const t=this.M,e=this.elTop;e.innerHTML="";const n=t.firstSide();e.append(nt("div","gm-round",`第 ${t.rnd} / ${za} 轮 · 本轮先宣告：${n===0?"你":this.foeName}`));for(let r=0;r<2;r++){const a=t.clsOf(r),o=t.progress(r),l=nt("div","gm-prog");l.title=`得分：${Ma[a]}
特长：${Ys[a]}`;const c=nt("span","chip",`${r===0?"你":this.foeName} · ${Ai[a]}`);c.style.background=ia[a];const h=nt("span","bar"),u=nt("i");u.style.width=`${Math.min(100,o*100)}%`,u.style.background=ia[a],h.append(u);const d=t.phase==="declare"?t.res[r].ap:t.sides[r].ap;l.append(c,h,nt("small","",`${Math.round(o*100)}%（${J0[a]} ${t.R.M[r][Ec[a]]}/${ls[a]}，击倒 +${Math.round(t.R.kob[r]*100)}%） · 行动点 ${d}/${ka}`)),e.append(l)}const s=nt("div","gm-tools");s.append(Jt("怎么玩","ghost",()=>this.showRules()),Jt(this.fast?"动画：快":"动画：正常","ghost",r=>{this.fast=!this.fast,r.target.textContent=this.fast?"动画：快":"动画：正常"}),Jt("退出","ghost",()=>{var r;return(r=this.hooks)!=null&&r.exit?this.hooks.exit():this.close()})),e.append(s)}renderUnits(){const t=this.M,e=this.elUnits;e.innerHTML="";for(const n of t.R.U){if(n.perma)continue;const s=this.shown[n.uid]??[n.hp,n.down!==-1],r=nt("div",`gm-u ${n.side===0?"me":"foe"}${s[1]?" down":""}`),a=[];for(const l of Object.keys(n.st))a.push(Cg(l,n.st[l],t.rnd));n.mit>0&&a.push(`减伤${n.mit}`),n.shield>0&&a.push(`血痂${n.shield}`);for(const l of n.lis)a.push("转移");for(const l of t.R.conts)l.uid===n.uid&&a.push(`续·${l.cl.k==="atk"?"打":l.cl.k==="heal"?"奶":"减伤"}${l.cl.n}·第${l.start}秒·还${l.left}轮`);if(t.phase==="declare")if(t.passed[n.side].includes(n.uid))a.push("本轮不出手");else{const l=t.declared.find(c=>c.uid===n.uid);l&&a.push(`已宣告${Cn(l.ord)}`)}const o=s[1]?0:100*s[0]/n.mx;r.innerHTML=`<b>${n.side===0?"你的":"对手的"}${n.name}</b><span class="hp"><i style="width:${o}%"></i></span><em>${s[1]?"倒下·休整":`${s[0]}/${n.mx}`}</em><small>【${n.kw}】${n.kws?"已用":""}</small>${a.map(l=>`<span class="chip">${l}</span>`).join("")}`,r.addEventListener("click",()=>this.cardClicked(n.uid)),e.append(r)}}renderHand(){const t=this.M,e=this.elHand;e.innerHTML="",e.append(nt("span","dim","你的数字牌："),nt("span","chip gray","1 · 免费无限"));const n=t.phase==="declare"?t.res[0].cards:[];t.sides[0].cards.forEach((s,r)=>{const a=!s.once&&t.rnd-s.last<2;let o=`${s.v} · ${s.once?"骰子·一次性":"阶梯"}`,l=s.once?"chip dice":"chip gold";a?(o+="（冷却）",l="chip gray"):n.includes(r)&&(o+="（本轮已用）",l="chip gray"),e.append(nt("span",l,o))}),e.append(nt("small","dim",`${this.foeName}有 ${t.sides[1].cards.length} 张数字牌`))}renderDecl(){const t=this.M,e=this.elDecl;e.innerHTML="",e.append(nt("div","dim",t.phase==="declare"||t.phase==="assign"?"本轮已宣告（你看得到对方定下的每一句）":"上一轮的宣告"));const n=t.phase==="declare"||t.phase==="assign"?t.declared:t.lastDeclared;n.length||e.append(nt("small","dim","（还没有）"));for(const s of n){const r=s.side===0,a=`${Cn(s.ord)} ${r?"你":this.foeName} · ${t.R.U[s.uid].name} · 第 ${s.start} 秒 · 花 ${s.cost} 点${s.blood>0?`（其中 ${s.blood} 点用血付）`:""}${s.cv.length?`，数字牌 [${s.cv.join(", ")}]`:""}：${Qi(t,s.cl,0,s.side)}`;e.append(nt("div","decl "+(r?"me":"foe"),a))}if(t.phase==="declare")for(let s=0;s<2;s++)for(const r of t.passed[s])e.append(nt("small","dim",`${s===0?"你":this.foeName}的${t.R.U[r].name} 本轮不出手`))}log(t,e=""){const n=nt("div",e,t);this.elLog.append(n),this.elLog.scrollTop=this.elLog.scrollHeight}async step(){var s,r;const t=this.M,e=this.token;if(t.phase==="over"){this.showOver();return}if(t.phase==="assign"){this.beginAssign();return}if(t.phase!=="declare")return;const n=t.declareSide();if(n===-1){this.resolve();return}if(n===0){this.selUid=-1,this.setUi("pick_unit"),this.renderAct();return}this.setUi("foe"),this.renderAct(),await Hl(this.fast?50:600),e===this.token&&((r=(s=this.hooks)==null?void 0:s.foeStep)!=null&&r.call(s,t)||t.aiStep(),this.refreshAll(),this.step())}cardClicked(t){this.active&&(this.ui==="pick_unit"&&this.M.remaining[0].includes(t)?this.gate("unit",{uid:t})&&this.openComposer(t):this.ui==="target"?this.pickTarget(t):this.ui==="assign"&&this.pickLate(t))}pass(t){if(!this.gate("pass",{uid:t}))return;const e=this.M.submit(0,t,null);if(e){this.toast(e);return}this.refreshAll(),this.step()}openComposer(t){var e;this.selUid=t,this.cmp=new Lg(this.M,t,0,(e=this.hooks)==null?void 0:e.allow),this.setUi("compose"),this.renderAct()}renderComposer(){var E;const t=this.elAct,e=this.M,n=this.cmp;t.innerHTML="";const s=n.options(),r=s.parsed,a=e.clsOf(0),o=e.R.U[this.selUid],l=nt("div","cmp-head");l.append(nt("h3","",`给【${o.name}】拼一句`),nt("span","chip",`本轮还剩行动点 ${e.res[0].ap}`)),n.cp.blood>0&&l.append(nt("span","chip red",`不够可用血付，最多 ${e.bloodRoom(0,this.selUid)}`)),t.append(l,nt("small","talent",`职业特长：${Ys[a]}`));const c=nt("div","sugg");c.append(Jt("辅助轮：让电脑出几个主意（先看人话，点一下装进来）","ghost",()=>{this.gate("assist")&&this.showSuggestions(c)})),t.append(c);const h=nt("div","rail");n.tokens.forEach((y,R)=>{const x=nt("span",y.t==="n"?`tile num${Number(y.v)>1?" big":""}`:`tile${vn[String(y.v)]?" adv":""}`,String(y.v));h.append(x),r.glue[R]&&h.append(nt("span","glue",r.glue[R]))}),h.append(nt("span","tile ghost","?")),t.append(h),t.append(nt("p","cmp-text",r.err?r.err:r.complete?`这句话：${Qi(e,r.clauses)}。`:n.tokens.length?`拼到这里：${n.draftText()}（还没拼完）`:"这句话：（还是空的，从下面挑第一张）"));const u=nt("p","cmp-preview");t.append(u),t.append(nt("p","cmp-help",n.help()));const d=nt("div","opts");for(const y of s.words){const R=this.hl("word",y.w),x=nt("button",R?"w hl":this.hlKind("word")?"w dimmed":y.ok&&(vn[y.w]||y.w===kc[a])?"w primary":"w",y.w);x.disabled=!y.ok;let w=vn[y.w]?vn[y.w].desc:Rg[y.w]??"";y.w==="并"&&(w+=`（每多一段 +${n.cp.and} 行动点，最多 ${n.cp.clauses} 段）`),y.w==="持续"&&((E=r.cur)==null?void 0:E.k)!=="st"&&(w="续流特长：这一段以后每轮同一秒自动再来一次，后面放数字牌（一共几轮）"),vn[y.w]&&(w+=`（进阶词：卡组里还能用 ${n.wordLeft(y.w)} 张，价格 ${vn[y.w].price}）`),y.why&&(w+=` ${y.why}`);const C=n.previewWith({t:"w",v:y.w});x.title=`${w}
接上以后：${C}`;const I=()=>{u.textContent=y.ok?`接上它：${C}`:y.why};x.addEventListener("mouseenter",I),x.addEventListener("focus",I),x.addEventListener("mouseleave",()=>{u.textContent=""}),x.addEventListener("click",()=>{this.gate("word",{value:y.w})&&n.addWord(y.w)&&this.renderAct()}),d.append(x)}!s.words.length&&!s.num&&d.append(nt("small","dim","（这一段拼完了）")),t.append(nt("small","dim","下一张可以接（鼠标移上去，先看接上以后这句话怎么说）"),d),t.append(nt("small","dim","你的数字牌（1 免费无限用；放进句子里的那张本轮就用掉了）"));const p=nt("div","opts"),g=e.usableValues(0),_=n.usedValues(),m=(y,R,x,w="")=>{const C=nt("button",this.hl("num",R)?"w hl":this.hlKind("num")?"w dimmed":x?"w primary":"w",y);if(C.disabled=!x,x){const I=n.previewWith({t:"n",v:R,free:!!w});C.title=`${w}接上以后：${I}`;const A=()=>{u.textContent=`接上它：${I}`};C.addEventListener("mouseenter",A),C.addEventListener("focus",A),C.addEventListener("mouseleave",()=>{u.textContent=""})}C.addEventListener("click",()=>{this.gate("num",{value:R})&&n.addNumber(R)&&this.renderAct()}),p.append(C)};if(m("1（免费）",1,s.num),n.freeCount())for(const y of[2,3])m(`${y}（择流免费）`,y,!0,`择流选几个目标不用数字牌
`);for(const y of Object.keys(g).map(Number).sort((R,x)=>R-x)){const R=g[y]-(_[y]??0);m(`${y} ×${R}`,y,s.num&&R>0)}const f=e.sides[0].cards.filter(y=>!y.once&&e.rnd-y.last<2).length;f&&p.append(nt("span","chip gray",`另有 ${f} 张在冷却（上一轮用过的阶梯牌）`)),t.append(p);const v=n.costInfo();t.append(nt("p","cmp-cost",v.text));const T=nt("div","cmp-foot");T.append(Jt("撤回一张","ghost",()=>{this.gate("undo")&&(n.undo(),this.renderAct())}),Jt("全部拿下","ghost",()=>{this.gate("clear")&&(n.clear(),this.renderAct())}),Jt("取消","ghost",()=>{this.gate("restart")&&(this.cmp=null,this.setUi("pick_unit"),this.renderAct())}));const S=Jt(v.allLate?"拼好了 → 定起手秒数":"拼好了 → 去选目标","primary"+(this.hl("done")?" hl":""),()=>{this.gate("done")&&this.composerDone()});S.disabled=v.bad||!r.complete,T.append(S),t.append(T)}showSuggestions(t){const e=this.M,n=this.cmp;t.innerHTML="";const s=yg(e,0,this.selUid,3);if(!s.length){t.append(nt("small","dim","辅助轮：这个随从现在没什么好打的，可以让它这轮不出手。"));return}t.append(nt("small","dim","辅助轮 · 电脑会这样拼（按它的估值排；点一下装进句子，还能接着改）："));for(const r of s){const a=r.act;let o=`第 ${a.start} 秒 · 花 ${a.cost} 点${a.blood>0?`（${a.blood} 点用血付）`:""}`;r.gain<Gc&&(o+=" · 电脑觉得不太值");const l=Jt(`${Qi(e,a.cl)}  （${o}）`,"sug",()=>{const c=Ig(a.cl);n.tokens=structuredClone(c),n.sugg={act:a,tokens:structuredClone(c)},this.renderAct()});t.append(l)}}composerDone(){var e;const t=(e=this.cmp)==null?void 0:e.finish();if(t){this.cmp=null,this.pending=t;for(const n of t)n.tmode==="self"?n.tg=[this.selUid]:n.k!=="delay"&&!n.pre&&(n.tg=[]);this.pendI=0,this.advanceTargets()}}advanceTargets(){for(;this.pendI<this.pending.length;){const t=this.pending[this.pendI];if(t.k==="delay"){if((t.act??-1)>=0){this.pendI++;continue}break}if(t.tmode==="late"||(t.tg??[]).length>=(t.count??1)){this.pendI++;continue}break}this.setUi(this.pendI>=this.pending.length?"timing":"target"),this.renderAct()}targetOk(t){if(this.ui!=="target"||this.pendI>=this.pending.length)return!1;const e=this.pending[this.pendI];if(e.k==="delay")return!1;const n=this.M.R.U[t];return n.down!==-1||n.side===1!=((e.side??"enemy")==="enemy")?!1:!e.tg.includes(t)}pickTarget(t){this.targetOk(t)&&this.gate("target",{uid:t})&&(this.pending[this.pendI].tg.push(t),this.advanceTargets())}declare(t){const e=this.M,n=e.buildAction(0,this.selUid,this.pending,t);if(n.err){this.toast(n.err);return}const s=e.submit(0,this.selUid,n.act);if(s){this.toast(s);return}this.pending=[],this.refreshAll(),this.step()}latePool(t){return this.M.R.U.filter(e=>e.down===-1&&e.side===1==(t.side==="enemy")).map(e=>e.uid)}lateOk(t){const e=this.M.pendingLate(0);return!!e.length&&this.latePool(e[0].cl).includes(t)&&!this.latePick.includes(t)}beginAssign(){if(!this.M.pendingLate(0).length){this.finishAssign();return}this.latePick=[],this.setUi("assign"),this.renderAct()}pickLate(t){if(!this.lateOk(t)||!this.gate("late",{uid:t}))return;this.latePick.push(t);const e=this.M.pendingLate(0)[0].cl;this.latePick.length>=Math.min(e.count,this.latePool(e).length)?this.commitLate():(this.highlight(),this.renderAct())}commitLate(){const t=this.M.pendingLate(0);t.length&&(this.M.setLate(t[0].ord,t[0].ci,this.latePick),this.latePick=[],this.M.pendingLate(0).length?(this.highlight(),this.renderAct()):this.finishAssign())}finishAssign(){this.M.finishAssign(),this.refreshAll(),this.step()}async resolve(){const t=this.M,e=this.token;this.setUi("resolving"),this.renderAct();const n={};for(const o of t.R.U)n[o.uid]=[o.hp,o.down!==-1];const s=[t.progress(0),t.progress(1)],r=[...t.declared],a=t.resolveRound();this.shown=n,this.elLog.innerHTML="",this.log(`—— 第 ${t.rnd} 轮结算 ——`,"gold"),await this.playEvents(a,r,e)&&(this.refreshAll(!0),this.roundSummary(s))}async playEvents(t,e,n){const s=a=>{const o=this.eventText(a,e);o&&this.log(o.text,o.cls),this.applyShown(a)},r=this.ctx.cast;if(r)return r.playRound({M:this.M,events:t,decl:e,step:s,alive:()=>n===this.token,fast:()=>this.fast});for(const a of t)if(s(a),this.fast||await Hl(350),n!==this.token)return!1;return!0}applyShown(t){let e=-1,n=0;switch(t.type){case"hit":case"redirected":case"burn":e=(t.type==="hit",t.tgt),n=(t.type==="burn",-t.dealt);break;case"heal":e=t.tgt,n=t.amount;break;case"blood":e=t.uid,n=-t.amount;break;case"ko":e=t.tgt,this.shown[e]=[0,!0];break;case"endure":e=t.tgt,this.shown[e]=[1,!1];break}if(e>=0&&n!==0&&this.shown[e]){const s=this.shown[e];this.shown[e]=[Math.max(0,s[0]+n),s[1]]}if(e>=0){const s=this.ctx.cards[Ze(e)];(n<0||t.type==="ko")&&s.hit(0),s.syncHp(this.shown[e][1]?0:this.shown[e][0],this.M.R.U[e].mx),this.renderUnits()}}eventText(t,e){const n=this.M,s=a=>Xa(n,a),r=(a,o="")=>({text:a,cls:o});switch(t.type){case"fire":return t.cont?r(`第 ${t.t} 秒 ${s(t.uid)} 的续自动再来一次`,"amber"):r(`第 ${t.t} 秒 ${Cn(t.ord)} ${s(t.uid)}出手`);case"blood":return r(`开打前 ${s(t.uid)} 用 ${t.amount} 点生命付了 ${Cn(t.ord)} 的行动点`,"red");case"lock":return r(`    择定目标：${t.tgts.map(s).join("、")}${t.changed?"（原定的倒了，换人）":""}`,"green");case"cont_set":return r(`    → 挂上续：以后 ${t.rounds} 轮每轮同一秒再来一次`,"amber");case"chain":return r(`${Cn(t.ord)} 连段：兑现 ${t.landed} 段（${t.kinds.join("、")}），得 ${t.points} 分${t.all?"（整句全中）":""}`,"cyan");case"hit":{const a=[];t.vuln>0&&a.push(`易伤 +${t.vuln}`);for(const o of Object.keys(t.parts))a.push(`${o} −${t.parts[o]}`);return r(`    → ${s(t.tgt)} 受到 ${t.amount} 点${a.length?`（${a.join("、")}）`:""}`)}case"redirected":return r(`    → 转移：${t.amount} 点转给 ${s(t.tgt)}`);case"heal":return r(`    → ${s(t.tgt)} 恢复 ${t.amount} 点`);case"mit":return r(`    → ${s(t.tgt)} 本轮每次少受 ${t.amount}`);case"status":return r(`    → ${s(t.tgt)}【${t.st}】${t.lv} 级（撑到第 ${t.end} 轮）`);case"listen":return r(`    → ${s(t.tgt)} 本轮受到的伤害会转给出手的人`);case"delay":return r(`    → 把 ${Cn(t.ord)} 推到第 ${t.to} 秒`);case"remove":return r(`    → 拆掉了 ${s(t.tgt)} 的保护${t.broke>0?`，掐断 ${t.broke} 个续`:""}`);case"fizzle":return r(`${Cn(t.ord)} 落空：${t.why}`,"dim");case"ko":return r(`${s(t.tgt)} 倒下了！${t.broke>0?`它的 ${t.broke} 个续断了`:""}`,"red");case"endure":return r(`    → ${s(t.tgt)}【不屈】留了 1 血`);case"burn":return r(`轮末 ${s(t.tgt)} 灼烧掉 ${t.dealt} 血`)}return null}roundSummary(t){var s,r;const e=this.M,n=this.elAct;this.setUi("round_end"),n.innerHTML="",n.append(nt("h3","",`第 ${e.rnd} 轮结束`));for(let a=0;a<2;a++)n.append(nt("p","",`${a===0?"你":this.foeName}：完成度 ${Math.round(t[a]*100)}% → ${Math.round(e.progress(a)*100)}%`));for(const a of e.roundNotes){const o=a.side===0?"你":this.foeName;if(a.type==="dice"){const l=a.rolls.filter(c=>c>1);n.append(nt("p","gold",`${o} ${a.why}，掷骰子：${a.rolls.join("、")} → ${l.length?`得到一次性数字牌 ${l.join("、")}`:"运气不好，都是 1"}`))}else a.type==="floor"?n.append(nt("p","gold",`${o} 得到保底数字【${a.value}】（能反复用）`)):a.type==="ladder"&&n.append(nt("p","green",`${o} 得分到 ${Math.round(a.at*100)}%：解锁 ${a.copies} 张【${a.value}】（能反复用，用完冷却一轮）`))}if(e.phase==="over"){n.append(Jt("看结果","primary",()=>this.showOver()));return}n.append(Jt("下一轮 →","primary big"+(this.hooks?" hl":""),()=>this.nextRoundClicked())),(r=(s=this.hooks)==null?void 0:s.roundEnd)==null||r.call(s,e)}nextRoundClicked(){const t=this.M;t.nextRound(),this.refreshAll(!0),this.log(`—— 第 ${t.rnd} 轮 ——`,"gold"),this.roundBegin()}showOver(){var o,l;const t=this.M,e=this.overlay;if(this.setUi("over"),(l=(o=this.hooks)==null?void 0:o.over)!=null&&l.call(o,t))return;e.hidden=!1,e.innerHTML="";const n=nt("div","gm-modal"),s=t.winner,r=nt("h1",s===0?"win":s===1?"lose":"",s===0?"胜利！":s===1?"落败":"平局");n.append(r);for(let c=0;c<2;c++)n.append(nt("p","",`${c===0?"你":this.foeName}（${t.clsOf(c)}）完成度 ${Math.round(t.progress(c)*100)}%`));n.append(nt("p","dim",`共 ${t.rnd} 轮`));const a=nt("div","foot");a.append(Jt("再来一局","primary",()=>{e.hidden=!0,this.begin()}),Jt("改设置","ghost",()=>this.showSetup()),Jt("退出","ghost",()=>{e.hidden=!0,this.close()})),n.append(a),e.append(n)}renderAct(){var t,e;this.renderAct0(),this.highlight(),(e=(t=this.hooks)==null?void 0:t.rendered)==null||e.call(t,this.clickInfo("unit"))}renderAct0(){var n;const t=this.M,e=this.elAct;if(this.ui==="compose"){this.renderComposer();return}switch(e.innerHTML="",this.ui){case"foe":e.append(nt("h3","dim",`${this.foeName}在想……`));break;case"pick_unit":{e.append(nt("h3","gold","轮到你：选一个随从，给它拼一句")),e.append(nt("small","dim","点下面的按钮（或点你的随从卡）。每个随从一轮一句；可以先让一个随从出手，看看对方怎么接，再定下一个。"));for(const s of t.remaining[0]){const r=t.R.U[s],a=nt("div","row2");a.append(Jt(`给【${r.name}】拼一句`,"primary"+(this.hl("unit",void 0,s)?" hl":""),()=>{this.gate("unit",{uid:s})&&this.openComposer(s)}),Jt("它这轮不出手","ghost"+(this.hl("pass",void 0,s)?" hl":""),()=>this.pass(s))),e.append(a)}e.append(nt("p","",`本轮行动点还剩 ${t.res[0].ap}`));break}case"target":{const s=this.pending[this.pendI];if(e.append(nt("h3","gold",`选目标（第 ${this.pendI+1} / ${this.pending.length} 段）`),nt("p","",us(null,s))),s.k==="delay"){e.append(nt("p","","要延后对方的哪一句？"));for(const r of t.declared)r.side===1&&e.append(Jt(`${Cn(r.ord)} ${this.foeName}·${t.R.U[r.uid].name} 第 ${r.start} 秒：${Qi(t,r.cl)}`,"sug"+(this.hl("act",r.ord)?" hl":""),()=>{this.gate("act",{value:r.ord})&&(s.act=r.ord,this.advanceTargets())}))}else e.append(nt("p","",`点 ${s.count??1} 个${(s.side??"enemy")==="enemy"?"敌方":"你的"}随从（已选 ${s.tg.length} 个）——直接点场上的卡`));e.append(Jt("重新拼","ghost",()=>{this.gate("restart")&&this.openComposer(this.selUid)}));break}case"timing":{const s=fr(this.pending,t.caps(0).wind);e.append(nt("h3","gold","第几秒起效？"),nt("p","",Qi(t,this.pending))),e.append(nt("small","dim",`这句最早第 ${s} 秒。越早越不容易被打断；对方的招落在哪一秒，看上面的时间轴。`));const r=Va(this.pending,t.caps(0).and);r>t.res[0].ap&&e.append(nt("p","red",`行动点差 ${r-t.res[0].ap}：开打时先从【${t.R.U[this.selUid].name}】身上扣 ${r-t.res[0].ap} 点生命付掉。`));const a=((n=this.pending[0])==null?void 0:n.sugg_start)??s;a!==s&&e.append(nt("p","green",`辅助轮建议第 ${a} 秒。`));const o=new Set(t.declared.filter(c=>c.side===1).map(c=>c.start)),l=nt("div","opts");for(let c=s;c<=$e;c++)l.append(Jt(`${c} 秒${o.has(c)?"·对方":""}`,this.hl("time",c)?"w hl":this.hlKind("time")?"w dimmed":c===a?"w primary":"w",()=>{this.gate("time",{value:c})&&this.declare(c)}));e.append(l,Jt("重新拼","ghost",()=>{this.gate("restart")&&this.openComposer(this.selUid)}));break}case"assign":{const s=t.pendingLate(0);if(!s.length)return;const r=s[0],a=r.cl,o=Math.min(a.count,this.latePool(a).length);e.append(nt("h3","green",`择流 · 定目标（还剩 ${s.length} 段）`)),e.append(nt("p","",`双方都宣告完了，对手看不到你的目标。现在点 ${o} 个${a.side==="enemy"?"敌方":"你的"}随从（已点 ${this.latePick.length} 个）。出手前目标倒了会自动换人。`));const l=t.declared.find(h=>h.ord===r.ord);l&&e.append(nt("p","decl me",`${Cn(l.ord)} ${t.R.U[l.uid].name} 第 ${l.start} 秒：${us(t,a)}`));const c=bg(t,0,r.ord,r.ci);e.append(Jt(`用建议：${c.map(h=>t.R.U[h].name).join("、")}`,"ghost",()=>{this.gate("late",{value:"auto"})&&(this.latePick=[...c],this.commitLate())}),Jt("剩下的全部用建议","ghost",()=>{this.gate("late",{value:"auto"})&&(Ta(t,0),this.finishAssign())}));break}case"resolving":e.append(nt("h3","gold","结算中……"),Jt("跳过动画","ghost",()=>{var s;this.fast=!0,(s=this.ctx.cast)==null||s.skip()}));break}}toast(t){const e=nt("div","gm-toast",t);document.body.append(e),setTimeout(()=>e.remove(),2200)}}const Ng={并:"#d6e6ff",续:"#ffd24a",择:"#62ffb0",血:"#ff4a5e"},Fg={atk:"#ff7a5c",heal:"#5dffb0",mit:"#5cc8ff",st:"#ff5dc8",redirect:"#ffd24a",delay:"#cfa37f",remove:"#e9fffb"},Wl={易伤:"#ff5d73",灼烧:"#ffa23a",衰弱:"#b58cff"},Og=new Set(["造成","伤害","施加","恢复","减少","增加","转为","自身","移除","延后","重复","持续","易伤","灼烧","衰弱"]),aa={hit:"atk",redirected:"atk",heal:"heal",mit:"mit",status:"st",listen:"redirect",delay:"delay",remove:"remove"},kg=new Set(["hit","redirected","heal","mit","status","listen","delay","remove","lock","cont_set","ko","endure"]),Bg=.8,zg=.36,Ee={out:i=>1-Math.pow(1-i,3),io:i=>i<.5?4*i*i*i:1-Math.pow(-2*i+2,3)/2,in:i=>i*i*i,back:i=>1+(1.9+1)*Math.pow(i-1,3)+1.9*Math.pow(i-1,2)},gn=i=>Math.max(0,Math.min(1,i)),Ut=(i,t)=>i+Math.random()*(t-i),hn=(i,t,e)=>i+(t-i)*e,Gg=(i,t,e)=>({x:hn(i.x,t.x,e),y:hn(i.y,t.y,e),s:hn(i.s,t.s,e),r:hn(i.r,t.r,e),o:hn(i.o,t.o,e),fl:hn(i.fl,t.fl,e)});let Xl=!1;function Hg(){if(Xl)return;Xl=!0;const i=document.createElement("style");i.textContent=`
.cs-layer { position: fixed; inset: 0; pointer-events: none; z-index: 4; overflow: hidden; }
.ro.cs-dim { opacity: 0.18; transition: opacity 0.25s; }
.cs-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.cs-chip { position: absolute; left: 0; top: 0; will-change: transform, opacity; transform-style: preserve-3d; font: 700 18px "Noto Sans SC", "PingFang SC", sans-serif; }
.cs-chip .f, .cs-chip .b { padding: 3px 10px 4px; border-radius: 6px; white-space: nowrap; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  background: linear-gradient(180deg, rgba(16, 52, 46, 0.96), rgba(4, 24, 20, 0.96));
  border: 1px solid color-mix(in srgb, var(--c, #fff) 75%, #000);
  box-shadow: 0 0 14px color-mix(in srgb, var(--c, #fff) 42%, transparent), inset 0 0 8px color-mix(in srgb, var(--c, #fff) 24%, transparent); }
.cs-chip .b { position: absolute; inset: 0; transform: rotateY(180deg); display: flex; align-items: center; justify-content: center; color: var(--c, #fff); font-size: 15px; letter-spacing: 0.1em;
  background: repeating-linear-gradient(45deg, rgba(10, 46, 40, 0.98) 0 6px, rgba(4, 24, 20, 0.98) 6px 12px); }
.cs-chip .w { color: var(--c, #fff); text-shadow: 0 0 8px color-mix(in srgb, var(--c, #fff) 60%, transparent); }
.cs-chip .w[data-tier="3"] { background: linear-gradient(90deg, #ffc7f1, #bdeeff, #fff3b8, #c8ffe0); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cs-chip .w.w-unit { border: 0; background: none; padding: 0; }
.cs-chip .w.w-num { color: #fff; font-family: "Chakra Petch", monospace; font-size: 1.12em; }
.cs-chip .w.fresh { animation: none; }
.cs-chip.pay .f { box-shadow: 0 0 22px color-mix(in srgb, var(--c, #fff) 70%, transparent), inset 0 0 10px color-mix(in srgb, var(--c, #fff) 38%, transparent); }
.cs-chip.metal .f { background: linear-gradient(180deg, #55606a, #1c2329 55%, #3b454e); border-color: #cfd8d6; box-shadow: 0 1px 0 #fff6 inset, 0 0 12px rgba(200, 220, 255, 0.35); }
.cs-chip.metal .w { text-shadow: 0 1px 0 #000; }
.cs-chip.crack .f { border-color: #ff4a5e; background: linear-gradient(180deg, rgba(70, 8, 16, 0.96), rgba(24, 2, 6, 0.96)); animation: cs-throb 0.42s ease-in-out infinite; }
.cs-chip.crack .f::after { content: ""; position: absolute; inset: 0; border-radius: 6px; pointer-events: none;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'><path d='M30 0 L38 14 L28 20 L40 32 L36 40 M72 0 L64 10 L74 18 L62 26 L68 40 M0 22 L16 18 L22 26' fill='none' stroke='%23ff6a7a' stroke-width='1.6'/></svg>") center/100% 100% no-repeat; filter: drop-shadow(0 0 3px #ff2a44); }
@keyframes cs-throb { 0%, 100% { box-shadow: 0 0 10px rgba(255, 60, 80, 0.5); } 50% { box-shadow: 0 0 24px rgba(255, 60, 80, 0.95); } }
.cs-chip.lock .f { border-color: #62ffb0; }
.cs-pop { position: absolute; left: 0; top: 0; font: 800 32px "Chakra Petch", "Noto Sans SC", monospace; white-space: nowrap; color: var(--c, #fff); text-shadow: 0 0 14px var(--c, #fff), 0 2px 3px #000; animation: cs-rise 1.05s cubic-bezier(.2, .8, .3, 1) both; }
.cs-pop small { font-size: 0.5em; margin-left: 5px; letter-spacing: 0.08em; opacity: 0.9; }
.cs-pop[data-cls="并"] { color: #fff2dc; text-shadow: 0 0 10px #ffb45a, 0 2px 0 #3a2410, 0 0 2px #fff; letter-spacing: 0.02em; }
.cs-pop[data-cls="续"] { color: #fff4b8; text-shadow: 0 0 14px #ffd24a, 0 0 4px #5cf; }
.cs-pop[data-cls="择"] { color: #d8fff0; text-shadow: 0 0 12px #2cff98, 0 0 2px #fff; }
.cs-pop[data-cls="血"] { color: #ffd6da; text-shadow: 0 0 12px #ff1f3d, 0 3px 0 #4a0510; }
.cs-pop.big { font-size: 44px; }
.cs-pop.tag { font-size: 24px; }
@keyframes cs-rise { 0% { opacity: 0; transform: translate(var(--x), calc(var(--y) + 10px)) translate(-50%, -50%) scale(0.4); }
  14% { opacity: 1; transform: translate(var(--x), var(--y)) translate(-50%, -50%) scale(1.3); }
  30% { transform: translate(var(--x), var(--y)) translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(var(--x), calc(var(--y) - 54px)) translate(-50%, -50%) scale(1); } }
.cs-hold .cs-pop { animation-play-state: paused; }
.cs-hint { position: absolute; left: 14px; bottom: 14px; padding: 3px 10px; font: 12px "Noto Sans SC", sans-serif; color: #a6f3e2; background: rgba(4, 28, 24, 0.7); border: 1px solid rgba(31, 214, 180, 0.35); border-radius: 12px; letter-spacing: 0.06em; }
`,document.head.appendChild(i)}class u_{constructor(t){q(this,"layer",document.createElement("div"));q(this,"canvas",document.createElement("canvas"));q(this,"g",this.canvas.getContext("2d"));q(this,"hint",document.createElement("div"));q(this,"chips",[]);q(this,"parts",[]);q(this,"layers",[]);q(this,"timers",[]);q(this,"tw",[]);q(this,"fxActive",new Map);q(this,"clock",0);q(this,"last",0);q(this,"raf",0);q(this,"running",!1);q(this,"skipped",!1);q(this,"holding",!1);q(this,"speedFast",()=>!1);q(this,"t0",0);q(this,"v",new D);q(this,"W",1);q(this,"H",1);q(this,"dbg",()=>window.__cast);this.env=t,Hg(),this.layer.className="cs-layer",this.canvas.className="cs-canvas",this.hint.className="cs-hint",this.hint.textContent="点击或按 Esc 跳过演出",this.layer.append(this.canvas,this.hint),this.layer.hidden=!0,document.body.appendChild(this.layer)}get active(){return this.running}skip(){if(!(!this.running||this.skipped)){this.skipped=!0,this.cleanup();for(const t of this.timers.splice(0))t.res()}}get sp(){var t;return(this.speedFast()?zg:Bg)*(((t=this.dbg())==null?void 0:t.scale)??1)}wait(t){return this.skipped?Promise.resolve():new Promise(e=>this.timers.push({at:this.clock+t*this.sp,res:e}))}async hold(t){const e=this.dbg(),n=()=>!!e&&(Array.isArray(e.pauseAt)?e.pauseAt.includes(t):e.pauseAt===t);!e||!n()||this.skipped||(t==="hit"&&await new Promise(s=>setTimeout(s,320)),e.paused=t,this.holding=!0,this.layer.classList.add("cs-hold"),await new Promise(s=>{const r=setInterval(()=>{(!n()||this.skipped)&&(clearInterval(r),s())},30)}),this.holding=!1,this.layer.classList.remove("cs-hold"),e.paused="")}startLoop(){this.last=performance.now();const t=e=>{if(!this.running)return;this.raf=requestAnimationFrame(t);const n=this.holding?0:Math.min(e-this.last,50);this.last=e,this.tick(n)};this.raf=requestAnimationFrame(t)}scr(t){return this.v.copy(t).project(this.env.camera),[(this.v.x+1)/2*this.W,(1-this.v.y)/2*this.H]}card(t){return this.env.cards[Ze(t)]}anchor(t,e){return this.scr(this.card(t).armor.anchorWorld(e,new D))}camUp(){return new D(0,1,0).applyQuaternion(this.env.camera.quaternion)}cardPts(t,e){const n=this.card(t),s=n.root.position,r=this.camUp(),a=[],o=(l,c)=>new D(s.x+c,.2,s.z+Hn.z).addScaledVector(r,l);for(const l of[-1,1])a.push(new D(s.x+l*1.9,0,s.z-1.2),new D(s.x+l*1.7,0,s.z+we.d/2+.15),o(_n.h+.6,l*1.1));return e&&a.push(o(_n.h*.5,3.9)),a}frame(t,e){const n=new Set(t.map(a=>Ze(a)));this.env.panels.forEach((a,o)=>a.el.classList.toggle("cs-dim",!n.has(o)));const s=[];for(const a of t)s.push(...this.cardPts(a,a===e));const r=this.env.solve(s);this.env.goal.look.copy(r.look),this.env.goal.dist=r.dist,this.env.goal.offY=r.offY,this.env.goal.offX=r.offX}tick(t){this.clock+=t;const e=this.clock;for(let s=this.timers.length-1;s>=0;s--)this.timers[s].at<=e&&this.timers.splice(s,1)[0].res();const n=1-Math.exp(-t/1e3*9);for(const[s,r]of this.fxActive){const a=s.armor.fx;a.k+=(r.k-a.k)*n,a.swing+=(r.swing-a.swing)*(1-Math.exp(-t/1e3*16))}for(let s=this.tw.length-1;s>=0;s--){const r=this.tw[s],a=gn((e-r.t0)/r.d);r.c.flip=hn(r.a,r.b,Ee.io(a)),a>=1&&this.tw.splice(s,1)}for(const s of this.chips){s.cur=s.f(e);const r=s.cur;if(r.fl+=s.flip,s.el.style.transform=`translate3d(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${r.r.toFixed(2)}deg) scale(${r.s.toFixed(3)}) perspective(520px) rotateY(${r.fl.toFixed(1)}deg)`,s.el.style.opacity=String(r.o),s.trail&&t>0)if(s.trail.kind==="metal")for(let a=0;a<2;a++)this.spark(r.x,r.y,s.trail.col,1,200);else s.trail.kind==="drip"?(this.add({k:"drop",x:r.x+Ut(-8,8),y:r.y+6,vx:Ut(-20,20),vy:Ut(0,60),g:900,t:0,life:650,size:Ut(2,4),col:"#ff2a44"}),this.glowDot(r.x,r.y,s.trail.col,16,260)):this.glowDot(r.x,r.y,s.trail.col,14+(s.numV??0)*.5,320)}this.draw(t,e)}add(t){this.parts.push(t)}glowDot(t,e,n,s,r){this.add({k:"dot",x:t,y:e,vx:0,vy:0,g:0,t:0,life:r,size:s,col:n})}spark(t,e,n,s=1,r=380,a=260){for(let o=0;o<s;o++){const l=Ut(0,Math.PI*2),c=Ut(a*.3,a);this.add({k:"spark",x:t,y:e,vx:Math.cos(l)*c,vy:Math.sin(l)*c,g:500,t:0,life:r*Ut(.6,1.1),size:Ut(1,2.2),col:n})}}ring(t,e,n,s,r,a=520,o=3){this.add({k:"ring",x:t,y:e,vx:0,vy:0,g:0,t:0,life:a,size:o,col:n,r1:r}),this.parts[this.parts.length-1].vx=s}draw(t,e){const n=this.g;n.clearRect(0,0,this.W,this.H),n.globalCompositeOperation="lighter";for(let r=this.layers.length-1;r>=0;r--)this.layers[r](n,e)===!1&&this.layers.splice(r,1);const s=t/1e3;for(let r=this.parts.length-1;r>=0;r--){const a=this.parts[r];a.t+=t;const o=a.t/a.life;if(o>=1){this.parts.splice(r,1);continue}switch(a.vy+=a.g*s,a.x+=a.vx*s*(a.k==="ring"?0:1),a.y+=a.vy*s*(a.k==="ring"?0:1),n.globalAlpha=1-o,a.k){case"spark":n.strokeStyle=a.col,n.lineWidth=a.size,n.beginPath(),n.moveTo(a.x,a.y),n.lineTo(a.x-a.vx*.035,a.y-a.vy*.035),n.stroke();break;case"dot":{const l=a.size*(1-o*.5),c=n.createRadialGradient(a.x,a.y,0,a.x,a.y,l);c.addColorStop(0,a.col),c.addColorStop(1,"transparent"),n.fillStyle=c,n.globalAlpha=(1-o)*.8,n.beginPath(),n.arc(a.x,a.y,l,0,Math.PI*2),n.fill();break}case"ring":{const l=hn(a.vx,a.r1,Ee.out(o));n.strokeStyle=a.col,n.lineWidth=a.size*(1-o)+.5,n.beginPath(),n.arc(a.x,a.y,l,0,Math.PI*2),n.stroke();break}case"drop":n.globalCompositeOperation="source-over",n.fillStyle=a.col,n.beginPath(),n.ellipse(a.x,a.y,a.size*.7,a.size*1.4,0,0,Math.PI*2),n.fill(),n.globalCompositeOperation="lighter";break;case"ember":n.fillStyle=a.col,n.beginPath(),n.arc(a.x,a.y,a.size*(1-o*.6),0,Math.PI*2),n.fill();break;case"line":n.strokeStyle=a.col,n.lineWidth=a.size*(1-o*.6),n.beginPath(),n.moveTo(a.x,a.y),n.lineTo(a.x2,a.y2),n.stroke();break;case"plus":n.strokeStyle=a.col,n.lineWidth=2.5,n.beginPath(),n.moveTo(a.x-a.size,a.y),n.lineTo(a.x+a.size,a.y),n.moveTo(a.x,a.y-a.size),n.lineTo(a.x,a.y+a.size),n.stroke();break}}n.globalAlpha=1,n.globalCompositeOperation="source-over"}makeChips(t,e,n){const s=e.el.querySelectorAll(".ro-body .w"),r=s.length===t.length,a=[];t.forEach((o,l)=>{const c=document.createElement("div");c.className="cs-chip";const h=document.createElement("div");h.className="f";const u=ma(o,!1);h.appendChild(u);const d=document.createElement("div");d.className="b",d.textContent="锁",c.append(h,d);const p=u.style.getPropertyValue("--c");p&&c.style.setProperty("--c",p),o.k==="num"&&c.style.setProperty("--c","#ffffff"),this.layer.appendChild(c);const g=r?s[l]:null,_={el:c,face:h,tok:o,i:l,w:0,h:0,f:()=>({x:-999,y:-999,s:1,r:0,o:0,fl:0}),cur:{x:-999,y:-999,s:1,r:0,o:0,fl:0},payload:n.has(l),home:g,panel:e,flip:0};_.payload&&c.classList.add("pay"),o.k==="num"&&(_.numV=o.v),_.f=this.homeFn(_),a.push(_),this.chips.push(_)});for(const o of a)o.w=o.el.offsetWidth,o.h=o.el.offsetHeight,o.home&&(o.home.style.visibility="hidden");return a}homeFn(t){return()=>{const n=(t.home&&t.home.isConnected?t.home:t.panel.el).getBoundingClientRect();return{x:n.left+n.width/2,y:n.top+n.height/2,s:1,r:0,o:1,fl:0}}}move(t,e,n,s={}){if(this.skipped)return t.f=e,Promise.resolve();const r=t.f,a=this.clock,o=Math.max(1,n*this.sp),l=s.e??Ee.io,c=s.arc??0;return t.f=h=>{var g;const u=gn((h-a)/o),d=l(u),p=Gg(r(h),e(h),d);return c&&(p.y-=Math.sin(Math.PI*d)*c),(g=s.tick)==null||g.call(s,d),p},this.wait(n).then(()=>{var h;t.f=e,(h=s.tick)==null||h.call(s,1)})}setNum(t,e){if(t.tok.k!=="num")return;const n=t.face.firstElementChild;n.textContent=String(Math.round(t.tok.v*gn(e)))}overlay(t,e,n){const s=t.f,r=this.clock,a=Math.max(1,e*this.sp),o=l=>{const c=s(l);return n(c,gn((l-r)/a)),c};t.f=o,this.timers.push({at:r+a,res:()=>{t.f===o&&(t.f=s)}})}lockPulse(t,e=1.25){this.overlay(t,160,(n,s)=>{n.s*=1+(e-1)*(1-Ee.out(s))})}flipTo(t,e,n){t.flip!==e&&this.tw.push({c:t,a:t.flip,b:e,t0:this.clock,d:Math.max(1,n*this.sp)})}popup(t,e,n,s,r,a={}){if(this.skipped)return;const o=document.createElement("div");if(o.className="cs-pop"+(a.big?" big":"")+(a.tag?" tag":""),o.dataset.cls=s,o.style.setProperty("--x",`${t}px`),o.style.setProperty("--y",`${e}px`),o.style.setProperty("--c",r),o.textContent=n,a.small){const l=document.createElement("small");l.textContent=a.small,o.appendChild(l)}this.layer.appendChild(o),setTimeout(()=>o.remove(),1200)}async playRound(t){this.speedFast=t.fast;const e=()=>t.alive(),n=o=>{e()&&t.step(o)};if(document.hidden){for(const o of t.events)n(o);return e()}this.W=this.env.app.clientWidth,this.H=this.env.app.clientHeight;const s=Math.min(window.devicePixelRatio||1,2);this.canvas.width=this.W*s,this.canvas.height=this.H*s,this.canvas.style.width=`${this.W}px`,this.canvas.style.height=`${this.H}px`,this.g.setTransform(s,0,0,s,0,0),this.skipped=!1,this.running=!0,this.layer.hidden=!1,this.timers=[],this.clock=0,this.t0=performance.now(),this.startLoop();const r=o=>{o.key==="Escape"&&this.skip()},a=()=>{performance.now()-this.t0>300&&this.skip()};window.addEventListener("keydown",r,!0),window.addEventListener("pointerdown",a,!0);try{const o=new Map,l=[];let c=null;for(const h of t.events){if(h.type==="blood"){const u=o.get(h.ord)??[];u.push(h),o.set(h.ord,u);continue}if(h.type==="fire"){c={fire:h,evs:[]},l.push({g:c});continue}if(c&&kg.has(h.type)){c.evs.push(h);continue}c=null,l.push({ev:h})}for(const h of l){if(!e())return!1;"g"in h?await this.playGroup(t,h.g,o.get(h.g.fire.ord)??[],n):await this.playSingle(t,h.ev,n)}for(const h of o.values())for(const u of h)l.some(d=>"g"in d&&d.g.fire.ord===u.ord)||n(u);return e()}finally{window.removeEventListener("keydown",r,!0),window.removeEventListener("pointerdown",a,!0),this.cleanup(),this.env.release(),this.running=!1,cancelAnimationFrame(this.raf),this.layer.hidden=!0,this.g.clearRect(0,0,this.W,this.H)}}undim(){for(const t of this.env.panels)t.el.classList.remove("cs-dim")}cleanup(){this.undim();for(const t of this.chips)t.home&&(t.home.style.visibility=""),t.el.remove();this.chips=[],this.parts=[],this.layers=[];for(const[t]of this.fxActive)t.armor.fx.k=0,t.armor.fx.swing=0,t.armor.fx.kind="";this.fxActive.clear(),this.layer.querySelectorAll(".cs-pop").forEach(t=>t.remove()),this.holding=!1}async playSingle(t,e,n){if(e.type==="burn"&&!this.skipped){const[s,r]=this.anchor(e.tgt,"chest");this.frame([e.tgt]),await this.wait(380),n(e);const a=Wl.灼烧;for(let o=0;o<22;o++)this.add({k:"ember",x:s+Ut(-30,30),y:r+Ut(0,60),vx:Ut(-20,20),vy:Ut(-160,-60),g:-40,t:0,life:Ut(500,900),size:Ut(2,5),col:o%2?"#ffcf6a":a});this.popup(s,r-30,`-${e.dealt}`,"并",a,{small:"灼烧"}),await this.wait(620),this.env.release(),this.undim(),await this.wait(200);return}if(n(e),e.type==="fizzle"&&!this.skipped){const[s,r]=this.anchor(e.uid,"chest");this.popup(s,r-20,"落空","并","#93a8c9",{tag:!0}),await this.wait(420)}else await this.wait(e.type==="chain"?300:120)}async playGroup(t,e,n,s){const r=t.M,a=e.fire,o=a.uid,l=r.R.U[o],c=a.cont?null:t.decl.find(A=>A.ord===a.ord&&A.uid===o)??null;let h=[];const u=[];let d=[];if(c){d=c.cl,h=rr(r,c,0);let A=0;c.cl.forEach((U,L)=>{const k=rr(r,{...c,cl:[U]},0).length,$=A+(L>0?1:0);u.push([$,$+k]),A=$+k})}else{const A=e.evs.find(L=>aa[L.type]);d=[{k:A?aa[A.type]:"atk"}],h=[{k:"word",w:"持续"}],(A==null?void 0:A.type)==="hit"?h.push({k:"word",w:"造成"},{k:"num",v:A.amount},{k:"word",w:"伤害"}):(A==null?void 0:A.type)==="heal"?h.push({k:"word",w:"恢复"},{k:"num",v:A.amount}):(A==null?void 0:A.type)==="mit"&&h.push({k:"word",w:"减少"},{k:"word",w:"伤害"},{k:"num",v:A.amount}),u.push([0,h.length])}const p=d.map((A,U)=>{var L,k;return{kind:A.k,ci:U,evs:[],locks:[],first:((L=u[U])==null?void 0:L[0])??0,last:((k=u[U])==null?void 0:k[1])??h.length}}),g=[];let _=[],m=0;for(const A of e.evs){const U=aa[A.type];if(A.type==="lock")_.push(A);else if(U){let L=p.findIndex((k,$)=>$>=m&&k.kind===U);L<0&&(L=p.findIndex(k=>k.kind===U)),L<0&&(L=Math.min(m,p.length-1)),m=L,p[L].evs.push(A),_.length&&(p[L].locks.push(..._),_=[])}else g.push(A)}g.unshift(..._);const f=()=>{s(a);for(const A of n)s(A);for(const A of p){for(const U of A.locks)s(U);for(const U of A.evs)s(U)}for(const A of g)s(A)};if(this.skipped){f();return}const v=Ze(o),T=this.env.cards[v],S=this.env.panels[v],E=(()=>{try{return r.clsOf(l.side)??"并"}catch{return"并"}})(),y=Ng[E]??"#fff";{const A=this.dbg();A&&(A.cur={uid:o,cls:E,kinds:d.map(U=>U.k).join("+")})}const R=new Set;h.forEach((A,U)=>{(A.k==="num"||A.k==="word"&&Og.has(A.w))&&R.add(U)});const x={k:0,swing:0};this.fxActive.set(T,x),T.armor.fx.kind="asm",T.armor.fx.col=y,s(a),this.frame([o],o);const w=this.makeChips(h,S,R);if(w.forEach((A,U)=>{const L=A.f,k=this.clock+U*22*this.sp,$=260*this.sp;A.f=H=>{const j=L(H),X=Ee.back(gn((H-k)/$));return j.y-=26*X,j.s=1+.18*X,j.r=(U%2?1:-1)*3*X,j}}),n.length)for(const A of n){s(A);const[U,L]=this.anchor(o,"chest");this.popup(U,L+10,`-${A.amount}`,"血","#ff4a5e",{small:"付血"})}await this.wait(480),await this.hold("zoom"),x.k=1;const C=()=>{const[A,U]=this.anchor(o,"chest");return{x:A,y:U-6,s:1,r:0,o:1,fl:0}};await this.assemble(E,w,C,o,y,u),await this.hold("assemble");const I=new Set;for(const A of p)for(const U of A.evs){const L=U.type==="delay"?-1:U.tgt;L!==void 0&&L>=0&&L!==o&&I.add(L)}I.size&&(this.frame([o,...I],o),await this.wait(420)),await this.hold("aim");for(const A of p){if(this.skipped){for(const U of A.locks)s(U);for(const U of A.evs)s(U);continue}await this.strike(t,E,o,A,w,C,y,s)}for(const A of g){if(s(A),this.skipped)continue;const[U,L]=A.type==="cont_set"?this.anchor(o,"halo"):this.anchor(A.tgt??o,"chest");A.type==="ko"?(this.popup(U,L,"击倒",E,"#ff4a5e",{big:!0}),this.burst(U,L,"#ff4a5e",28),await this.wait(420)):A.type==="endure"?this.popup(U,L,"不屈",E,"#ffd24a",{tag:!0}):A.type==="cont_set"&&this.popup(U,L,`续 ×${A.rounds}`,E,"#ffd24a",{tag:!0})}await this.wait(150),await this.hold("return"),x.k=0,x.swing=0,this.env.release(),this.undim();for(const A of w)this.flipTo(A,0,200);await Promise.all(w.map((A,U)=>this.wait(U*18).then(()=>this.move(A,this.homeFn(A),430,{e:Ee.io,arc:22}))));for(const A of w)A.home&&(A.home.style.visibility=""),A.el.remove();this.chips=this.chips.filter(A=>!w.includes(A)),T.armor.fx.kind="",await this.wait(120),this.fxActive.delete(T),T.armor.fx.k=0,T.armor.fx.swing=0,await this.hold("pullback")}burst(t,e,n,s){this.spark(t,e,n,s,520,380),this.ring(t,e,n,8,90,480,4),this.glowDot(t,e,n,90,380)}async assemble(t,e,n,s,r,a){const o=e.length,l=e.map((g,_)=>{const m=_/o*Math.PI*2+.6;return{x:Math.cos(m)*150+Ut(-20,20),y:Math.sin(m)*70-20+Ut(-12,12),r:Ut(-14,14)}}),c=5,h=Math.ceil(o/c),u=[];for(let g=0;g<h;g++){const _=e.slice(g*c,g*c+c);let f=-(_.reduce((v,T)=>v+T.w,0)+(_.length-1)*8)/2;_.forEach(v=>{u[v.i]={x:f+v.w/2,y:(g-(h-1)/2)*38},f+=v.w+8})}const d=(g,_,m=1,f=0,v=0)=>T=>{const S=n(T);return{x:S.x+g,y:S.y+_,s:m,r:f,o:1,fl:v}},p=Math.min(70,520/Math.max(o,1));if(t==="并"){await Promise.all(e.map((m,f)=>this.wait(f*25).then(()=>this.move(m,d(l[f].x,l[f].y,.95,l[f].r),420,{e:Ee.out,arc:40})))),await this.hold("fly");for(const m of e)m.el.classList.add("metal");for(let m=0;m<o;m++){const f=e[m],v=u[f.i];this.move(f,d(v.x,v.y,1,0),150,{e:Ee.in}).then(()=>{if(this.skipped)return;const S=n(this.clock);this.spark(S.x+v.x,S.y+v.y,"#ffe9b0",9,380,300),this.spark(S.x+v.x,S.y+v.y,"#cfe3ff",5,300,200),this.ring(S.x+v.x,S.y+v.y,"#e8f2ff",6,34,260,2),this.lockPulse(f,1.32),this.overlay(f,130,(E,y)=>{E.x+=Math.sin(y*Math.PI*3)*4*(1-y),E.y+=(1-y)*3})}),await this.wait(p+40)}await this.wait(150);const g=this.clock;this.layers.push((m,f)=>{const v=gn((f-g)/(260*this.sp)),T=n(f);m.globalAlpha=.35+.45*(1-Ee.out(gn((f-g-300)/500))),m.strokeStyle="#dbe9ff",m.lineWidth=2;for(let S=0;S<h;S++){const E=e.slice(S*c,S*c+c);if(!E.length)continue;const y=E.reduce((x,w)=>x+w.w,0)+(E.length-1)*8,R=T.y+(S-(h-1)/2)*38+22;m.beginPath(),m.moveTo(T.x-y/2-6,R),m.lineTo(T.x-y/2-6+(y+12)*v,R),m.stroke()}return m.globalAlpha=1,f-g<900}),e.forEach(m=>this.lockPulse(m,1.14));const _=n(this.clock);this.ring(_.x,_.y,"#dbe9ff",20,140,520,3),e.forEach(m=>{m.rest=d(u[m.i].x,u[m.i].y)}),await this.wait(260)}else if(t==="续"){const m=this.clock,f=v=>T=>{const S=n(T),E=v/o*Math.PI*2+(T-m)/1e3*2.6;return{x:S.x+Math.cos(E)*128,y:S.y-18+Math.sin(E)*62,s:.88+.14*Math.sin(E),r:0,o:1,fl:0}};this.layers.push((v,T)=>{const S=n(T),E=(T-m)/1e3*2.6;v.lineWidth=3;for(let y=0;y<3;y++)for(let R=0;R<30;R++){const x=E+y/3*Math.PI*2-R*.045,w=x-.05;v.strokeStyle=`rgba(255, 210, 74, ${(1-R/30)*.55})`,v.beginPath(),v.ellipse(S.x,S.y-18,128,62,0,w,x),v.stroke()}return v.strokeStyle="rgba(120, 220, 255, 0.18)",v.lineWidth=1.5,v.beginPath(),v.ellipse(S.x,S.y-18,128,62,0,0,Math.PI*2),v.stroke(),this.chips.some(y=>e.includes(y))}),await Promise.all(e.map((v,T)=>this.wait(T*40).then(()=>this.move(v,f(T),480,{e:Ee.out,arc:30})))),await this.hold("fly"),e.forEach((v,T)=>{v.rest=f(T)}),await this.wait(700)}else if(t==="择"){const g=_=>{const m=o===1?0:_/(o-1)-.5;return f=>{const v=n(f);return{x:v.x+m*Math.min(o*66,520),y:v.y-98-Math.cos(m*Math.PI)*26+Math.sin(f/380+_)*4,s:1,r:m*10,o:1,fl:0}}};await Promise.all(e.map((_,m)=>this.wait(m*35).then(()=>this.move(_,g(m),460,{e:Ee.out,arc:36})))),e.forEach((_,m)=>{_.rest=g(m)}),await this.hold("fly"),await Promise.all(e.map((_,m)=>this.wait(m*45).then(()=>(this.flipTo(_,180,300),this.overlay(_,300,(f,v)=>{f.s*=1+.15*Math.sin(v*Math.PI)}),this.wait(300)))));for(const _ of e)_.el.classList.add("lock");await this.wait(120)}else{await Promise.all(e.map((m,f)=>this.wait(f*35).then(()=>this.move(m,d(u[m.i].x,u[m.i].y,1,Ut(-3,3)),520,{e:Ee.in,arc:-18})))),await this.hold("fly");for(const m of e)m.el.classList.add("crack"),m.rest=d(u[m.i].x,u[m.i].y);const g=this.clock;this.layers.push((m,f)=>{for(const v of e)Math.random()<.22&&this.add({k:"drop",x:v.cur.x+Ut(-v.w/2,v.w/2),y:v.cur.y+v.h/2,vx:Ut(-10,10),vy:Ut(10,60),g:900,t:0,life:700,size:Ut(2,4),col:"#ff2a44"});return f-g<1600&&this.chips.some(v=>e.includes(v))}),e.forEach(m=>this.overlay(m,700,f=>{f.x+=Math.sin(this.clock/28)*1.6}));const _=n(this.clock);this.ring(_.x,_.y,"#ff2a44",10,120,620,4),this.glowDot(_.x,_.y,"#ff1f3d",130,560),await this.wait(520)}}async strike(t,e,n,s,r,a,o,l){var I;const c=this.card(n),h=c.armor.fx,u=this.fxActive.get(c),d=Fg[s.kind]??o,p=r.filter(A=>A.i>=s.first&&A.i<s.last),g=p.filter(A=>A.payload);for(const A of s.locks)l(A);const _=[];for(const A of s.evs){const U=A.type==="delay"?-1:A.tgt;U!==void 0&&U>=0&&!_.includes(U)&&_.push(U)}const m=s.evs.find(A=>A.type==="delay"),f=m?((I=t.decl.find(A=>A.ord===m.ord))==null?void 0:I.uid)??n:-1;if(h.kind=s.kind,h.col=d,e==="择"&&_.length){const A=this.clock,U=520*this.sp,L=()=>_.map(H=>this.anchor(H,"chest"));this.layers.push((H,j)=>{const X=gn((j-A)/U),tt=gn((X-.7)/.3);H.strokeStyle=tt>0?"#c8ffe4":"#62ffb0",H.lineWidth=2.5;for(const[et,yt]of L()){const wt=hn(90,40,Ee.out(X)),ne=(1-X)*10;H.beginPath(),H.arc(et+Math.sin(j/40)*ne,yt+Math.cos(j/33)*ne,wt,0,Math.PI*2),H.stroke();const kt=wt+6;for(const[qt,Y]of[[-1,-1],[1,-1],[1,1],[-1,1]])H.beginPath(),H.moveTo(et+qt*kt,yt+Y*(kt-14)),H.lineTo(et+qt*kt,yt+Y*kt),H.lineTo(et+qt*(kt-14),yt+Y*kt),H.stroke();H.beginPath(),H.moveTo(et-10,yt),H.lineTo(et+10,yt),H.moveTo(et,yt-10),H.lineTo(et,yt+10),H.stroke()}return j-A<U+520*this.sp}),await this.wait(520);for(const H of p)this.flipTo(H,0,260);await this.wait(280);const[k,$]=this.anchor(_[0],"chest");this.popup(k,$-70,"锁定",e,"#62ffb0",{tag:!0})}if(await this.hold("lock"),!s.evs.length){const[A,U]=this.anchor(n,"chest");this.popup(A,U-40,"落空",e,"#93a8c9",{tag:!0}),await this.wait(300);return}u.swing=s.kind==="atk"?1:0,await this.wait(s.kind==="atk"?170:110);const v=A=>{const U=s.kind==="mit"?"shield":"chest";return()=>{const[L,k]=this.anchor(A,U);return{x:L,y:k,s:1.1,r:0,o:1,fl:0}}},T=f>=0&&!_.length?(()=>{const A=this.env.panels[Ze(f)].el;return()=>{const U=A.getBoundingClientRect();return{x:U.left+U.width/2,y:U.top+U.height/2,s:1,r:0,o:1,fl:0}}})():null,S=e==="血"?560:s.kind==="heal"?700:s.kind==="redirect"?780:e==="续"?620:480,E=e==="血"?Ee.in:e==="择"||s.kind==="heal"?Ee.io:Ee.in,y=e==="血"?"#ff3a52":e==="并"?"#e8f2ff":e==="择"?"#62ffb0":d,R=e==="血"?"drip":e==="并"?"metal":"glow",x=T??v(_[0]??n);for(let A=1;A<_.length;A++)this.comet(a,v(_[A]),y,S);if(e==="择"){const[A,U]=this.anchor(n,"blade"),[L,k]=this.anchor(_[0]??n,"chest");this.add({k:"line",x:A,y:U,x2:L,y2:k,vx:0,vy:0,g:0,t:0,life:260,size:3,col:"#9dffd0"})}const w=Promise.all(g.map((A,U)=>this.wait(U*45).then(async()=>{A.trail={col:y,kind:R};const L=A.tok.k==="num"?1.2+Math.min(A.tok.v,24)*.035:1.1,k=H=>{const j=x(H),X=U-(g.length-1)/2;return{...j,x:j.x+X*26,y:j.y+(e==="血"?0:X*4)-6,s:L}},$=e==="续"?90:s.kind==="heal"?110:s.kind==="redirect"?-120:e==="择"?0:44;await this.move(A,k,S,{e:E,arc:$,tick:A.tok.k==="num"?H=>this.setNum(A,H):void 0})})));await this.wait(S*.6),await this.hold("flight"),await w;const C=new Map;for(const A of s.evs)l(A),this.impact(A,e,n,f,C);for(const A of g)A.trail=void 0,A.el.style.filter="";u.swing=0,await this.hold("hit"),await this.wait(e==="续"?300:260),await Promise.all(g.map((A,U)=>this.wait(U*30).then(async()=>{A.tok.k==="num"&&this.setNum(A,1),await this.move(A,A.rest??a,e==="续"?480:340,{e:Ee.out,arc:e==="续"?-60:30})}))),h.kind="asm"}comet(t,e,n,s){if(this.skipped)return;const r=this.clock,a=s*this.sp;this.layers.push((o,l)=>{const c=gn((l-r)/a),h=t(l),u=e(l),d=Ee.in(c),p=hn(h.x,u.x,d),g=hn(h.y,u.y,d)-Math.sin(Math.PI*d)*40;return this.glowDot(p,g,n,26,260),c<1})}impact(t,e,n,s,r){if(this.skipped)return;const a=(l,c="chest")=>this.anchor(l,c),o=l=>{const c=r.get(l)??0;return r.set(l,c+1),c*30};switch(t.type){case"hit":{const[l,c]=a(t.tgt),h=o(t.tgt),u=Math.min(t.dealt,24),d=e==="血"?"#ff3a52":e==="择"?"#62ffb0":e==="续"?"#ffd24a":"#ffb45a";if(this.burst(l,c,d,10+u),e==="并")this.spark(l,c,"#fff",14,420,420),this.ring(l,c,"#fff",4,70,300,3);else if(e==="续")this.ring(l,c,"#ffd24a",10,150,700,3),setTimeout(()=>{!this.skipped&&this.running&&this.ring(l,c,"#7fe6ff",6,110,520,2)},160*this.sp);else if(e==="择")this.ring(l,c,"#fff",40,8,320,3);else for(let p=0;p<18;p++)this.add({k:"drop",x:l,y:c,vx:Ut(-220,220),vy:Ut(-260,40),g:900,t:0,life:Ut(500,900),size:Ut(2,5),col:"#d3162d"});this.popup(l,c-30-h,`-${t.dealt}`,e,d,{big:t.dealt>=10,small:t.dealt<t.amount?`挡${t.amount-t.dealt}`:t.vuln>0?"易伤":e==="续"?"↻":void 0});break}case"redirected":{const[l,c]=a(t.tgt),h=o(t.tgt);this.burst(l,c,"#ffd24a",14),this.popup(l,c-30-h,`-${t.dealt}`,e,"#ffd24a",{small:"转移"});break}case"heal":{const[l,c]=a(t.tgt),h=o(t.tgt);for(let u=0;u<14;u++)this.add({k:"plus",x:l+Ut(-40,40),y:c+Ut(0,50),vx:Ut(-10,10),vy:Ut(-120,-50),g:0,t:0,life:Ut(600,1e3),size:Ut(4,8),col:"#5dffb0"});this.ring(l,c,"#5dffb0",10,110,700,3),this.glowDot(l,c,"#5dffb0",120,520),this.popup(l,c-30-h,`+${t.amount}`,e,"#5dffb0");break}case"mit":{const[l,c]=a(t.tgt,"shield"),h=o(t.tgt);this.ring(l,c,"#9fe0ff",12,100,640,4),this.ring(l,c,"#5cc8ff",4,70,520,2),this.glowDot(l,c,"#5cc8ff",100,480),this.popup(l,c-56-h,`-${t.amount}`,e,"#7fd6ff",{small:"减伤"});break}case"status":{const[l,c]=a(t.tgt),h=o(t.tgt),u=Wl[t.st]??"#ff5dc8";if(t.st==="灼烧")for(let d=0;d<20;d++)this.add({k:"ember",x:l+Ut(-30,30),y:c+Ut(0,50),vx:Ut(-20,20),vy:Ut(-170,-70),g:-40,t:0,life:Ut(500,900),size:Ut(2,5),col:d%2?"#ffcf6a":u});else if(t.st==="易伤"){this.spark(l,c,u,18,520,340);for(let d=0;d<4;d++){const p=Ut(0,6.28);this.add({k:"line",x:l+Math.cos(p)*8,y:c+Math.sin(p)*8,x2:l+Math.cos(p)*70,y2:c+Math.sin(p)*70,vx:0,vy:0,g:0,t:0,life:420,size:3,col:u})}}else for(let d=0;d<16;d++)this.add({k:"ember",x:l+Ut(-36,36),y:c-Ut(0,40),vx:Ut(-10,10),vy:Ut(40,140),g:60,t:0,life:Ut(500,900),size:Ut(2,4),col:u});this.ring(l,c,u,8,90,560,3),this.popup(l,c-40-h,t.st,e,u,{small:`Lv${t.lv}`});break}case"listen":{const[l,c]=a(t.tgt),[h,u]=a(n);this.add({k:"line",x:l,y:c,x2:h,y2:u,vx:0,vy:0,g:0,t:0,life:520,size:3,col:"#ffd24a"}),this.ring(l,c,"#ffd24a",10,90,560,3),this.popup(l,c-40,"转移",e,"#ffd24a",{tag:!0});break}case"delay":{const l=this.env.panels[Ze(s)].el.getBoundingClientRect(),c=l.left+l.width/2,h=l.top+l.height/2;this.ring(c,h,"#cfa37f",10,90,600,3),this.popup(c,h-20,`延后 +${t.sec}`,e,"#e8c9a6",{tag:!0,small:"秒"});break}case"remove":{const[l,c]=a(t.tgt);this.spark(l,c,"#e9fffb",26,600,420),this.ring(l,c,"#e9fffb",6,100,520,3),this.popup(l,c-40,"拆除",e,"#e9fffb",{tag:!0,small:t.broke>0?`断${t.broke}续`:void 0});break}}}}export{Wg as $,Cc as A,Rg as B,It as C,Jg as D,t_ as E,Kl as F,h_ as G,Kg as H,Ln as I,Xg as J,rc as K,Rh as L,sr as M,$g as N,n_ as O,ei as P,Ql as Q,sg as R,Sh as S,Ia as T,r_ as U,ut as V,vn as W,De as X,un as Y,Ae as Z,Yg as _,jg as a,qg as a0,os as a1,$n as a2,ds as a3,Ue as a4,ag as a5,Ec as a6,ng as a7,Bc as a8,Ks as a9,za as aa,ea as ab,Ai as ac,ia as ad,Ys as ae,Ma as af,ls as ag,_a as ah,cs as ai,hs as aj,Ac as ak,wc as al,va as am,ig as an,rg as ao,ir as ap,xa as aq,as as ar,a_ as as,c_ as at,K0 as au,Y0 as av,en as b,qo as c,i_ as d,sn as e,s_ as f,o_ as g,e_ as h,rs as i,D as j,we as k,u_ as l,Qg as m,Hn as n,Zg as o,_n as p,ge as q,Je as r,l_ as s,pt as t,Ug as u,fe as v,qe as w,be as x,ic as y,or as z};
