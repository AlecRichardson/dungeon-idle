import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { state } from './store.ts';
import { calculate } from './game.ts';
import { ENCOUNTERS, FLOORS } from './content.ts';

class Vault extends Phaser.Scene {
  mage!: Phaser.GameObjects.Container;
  enemy!: Phaser.GameObjects.Container;
  enemyBar!: Phaser.GameObjects.Graphics;
  aura!: Phaser.GameObjects.Arc;
  sceneTitle!: Phaser.GameObjects.Text;
  enemyTitle!: Phaser.GameObjects.Text;
  trail!: Phaser.GameObjects.Graphics;
  lastSeq = 0;
  constructor() { super('vault'); }
  create() {
    const g = this.add.graphics();
    g.fillStyle(0x0a1116); g.fillRect(0, 0, 960, 450);
    // Original isometric masonry, generated once; no external art.
    const tile = (x: number, y: number, color: number) => { g.fillStyle(color); g.lineStyle(1, 0x344044, 0.5); const points = [{ x, y: y - 19 }, { x: x + 39, y }, { x, y: y + 19 }, { x: x - 39, y }]; g.fillPoints(points, true); g.strokePoints(points, true); };
    for (let row = 0; row < 12; row++) for (let col = 0; col < 13; col++) { const x = 86 + col * 64 + (row % 2) * 32; const y = 94 + row * 26; if (x < 912) tile(x, y, [0x253437, 0x29393b, 0x233136, 0x2d3c3e][(col * 7 + row * 3) % 4]); }
    // Back walls and buttresses.
    for (let i = 0; i < 15; i++) { const x = 24 + i * 64; g.fillStyle(i % 2 ? 0x354344 : 0x3d4b48); g.fillRect(x, 48, 60, 30); g.fillStyle(0x1b292c); g.fillRect(x, 81, 60, 23); }
    g.fillStyle(0x101e24); g.fillRect(0, 405, 960, 45); g.lineStyle(3, 0x475650); g.lineBetween(0, 405, 960, 405);
    for (const x of [90, 870]) {
      g.fillStyle(0x121e23); g.fillRect(x - 20, 60, 40, 73); g.fillStyle(0x46514b); g.fillRect(x - 26, 54, 52, 12); g.fillRect(x - 28, 128, 56, 12);
      this.add.ellipse(x, 115, 125, 95, 0xff9c41, 0.045);
      const fire = this.add.triangle(x, 93, 0, 21, 8, 0, 16, 21, 0xffb75e); this.tweens.add({ targets: fire, scaleY: 0.75, alpha: 0.7, duration: 370, yoyo: true, repeat: -1 });
    }
    // Closed vault door and scattered old slabs.
    g.fillStyle(0x0b151b); g.fillRoundedRect(425, 25, 110, 84, 30); g.lineStyle(3, 0x687365); g.strokeRoundedRect(425, 25, 110, 84, 30);
    g.fillStyle(0xa98b53); g.fillCircle(480, 68, 8); g.lineStyle(1, 0x141d21); g.strokeCircle(480, 68, 4);
    for (const [x,y] of [[160,320],[800,330],[740,160],[210,140]]) { g.fillStyle(0x596159, 0.3); g.fillRect(x,y,22,7); g.fillRect(x+25,y+8,10,5); }
    this.trail = this.add.graphics();
    this.mage = this.add.container(220, 280);
    const shadow = this.add.ellipse(0, 20, 43, 15, 0x000000, 0.45);
    this.aura = this.add.circle(0, 13, 26, 0xffb35d, 0.08);
    const robe = this.add.triangle(0, 0, 0, 42, 19, 0, 37, 42, 0x508d9b).setStrokeStyle(2, 0x8cb4ba);
    const hood = this.add.circle(0, -17, 12, 0x729ea4).setStrokeStyle(2, 0xb5cbc2);
    const face = this.add.ellipse(3,-16,12,9,0x19282e);
    const eye = this.add.circle(6,-17,2,0xf5e3a4);
    const staff = this.add.rectangle(23, -4, 4, 49, 0xaf925c).setAngle(12);
    const gem = this.add.circle(27,-29,6,0xffc77b);
    this.mage.add([shadow, this.aura, robe, hood, face, eye, staff, gem]);
    this.enemy = this.add.container(650,280);
    this.enemy.add([this.add.ellipse(0,20,57,16,0x000000,0.5), this.add.triangle(0,0,0,40,23,0,46,40,0x8d6060).setStrokeStyle(2,0xbc8780), this.add.circle(0,-15,17,0x6b565b).setStrokeStyle(2,0xae7975),this.add.circle(-6,-17,3,0xffd06c),this.add.circle(6,-17,3,0xffd06c),this.add.triangle(-20,-16,0,0,3,-18,12,0,0xaa8a77),this.add.triangle(20,-16,0,0,-3,-18,-12,0,0xaa8a77)]);
    this.enemyBar = this.add.graphics();
    this.enemyTitle = this.add.text(650, 210, '', { fontFamily: 'Georgia', fontSize: '16px', color: '#edd1b2', align: 'center' }).setOrigin(0.5);
    this.sceneTitle = this.add.text(26, 24, '', { fontFamily: 'Georgia', fontSize: '16px', color: '#b8bbae' });
    this.add.text(934, 426, 'EMBERVAULT  /  FIXED DIFFICULTY', { fontFamily: 'monospace', fontSize: '11px', color: '#7c918d' }).setOrigin(1,0.5);
    this.lastSeq = state.seq;
  }
  update(time: number) {
    const s = state; const local = s.encounter % 3; const target = [335,505,685][local];
    const start = local === 0 ? 175 : [335,505][local-1];
    const p = s.phase === 'moving' ? Math.min(1, s.timer / 2.5) : 1;
    const x = start + (target - start) * Phaser.Math.Easing.Sine.InOut(p);
    const moving = s.phase === 'moving' && !s.paused;
    this.mage.setPosition(x, 265 + (moving ? Math.sin(time / 95) * 3 : Math.sin(time / 480) * 1.5));
    this.mage.alpha = s.phase === 'death' ? 0.35 : 1;
    this.enemy.setPosition(target+85, 265 + Math.sin(time / 420) * 2).setScale(ENCOUNTERS[s.encounter].kind === 'boss' ? 1.35 : ENCOUNTERS[s.encounter].kind === 'elite' ? 1.12 : 0.9);
    this.enemy.visible = s.phase === 'fighting' || s.phase === 'moving';
    this.aura.setFillStyle(s.spell === 'fire' ? 0xffb35d : 0xb08aff, 0.1);
    this.sceneTitle.setText(`0${Math.floor(s.encounter / 3)+1}  /  ${FLOORS[Math.floor(s.encounter / 3)]}`);
    this.enemyTitle.setPosition(target+85, 190).setText(this.enemy.visible ? ENCOUNTERS[s.encounter].name : '');
    this.enemyBar.clear(); if (this.enemy.visible) { this.enemyBar.fillStyle(0x11191d); this.enemyBar.fillRoundedRect(target+35,209,100,8,3); this.enemyBar.fillStyle(0xc17465); this.enemyBar.fillRoundedRect(target+35,209,100*s.enemyHp/ENCOUNTERS[s.encounter].hp,8,3); }
    this.trail.clear(); this.trail.lineStyle(1,0xc6b787,0.12); this.trail.lineBetween(175,290,790,290);
    for (const e of s.events.filter(e=>e.seq > this.lastSeq)) {
      this.lastSeq = e.seq;
      const eventTarget = [335,505,685][(e.encounter ?? s.encounter) % 3];
      if (e.type === 'cast') {
        const color = e.element === 'fire' ? 0xffae56 : 0xbc8dff;
        if (e.element === 'shadow') { const arc = this.add.graphics().lineStyle(4,color,0.9); arc.beginPath(); arc.moveTo(x+24,242); arc.lineTo(x+58,224); arc.lineTo(eventTarget+50,257); arc.lineTo(eventTarget+85,249); arc.strokePath(); this.tweens.add({ targets:arc,alpha:0,duration:400,onComplete:()=>arc.destroy() }); }
        else { const bolt = this.add.circle(x+25,243,7,color).setStrokeStyle(5,0xffe2a5,0.15); this.tweens.add({targets:bolt,x:eventTarget+85,y:250,duration:220,onComplete:()=>bolt.destroy()}); }
        this.float(eventTarget+85, 232, `${e.crit ? '✧ ' : ''}${e.amount}`, e.element === 'fire' ? '#ffd089' : '#d6baff', e.crit ? 27 : 22);
      }
      if (e.type === 'hit') this.float(x,231,`−${e.amount}`,'#f6a69b',17);
      if (e.type === 'level') this.float(x,190,`LEVEL ${s.level}`,'#f9dd86',21);
      if (e.type === 'gnome') this.float(170, 350, `+${e.amount} GOLD`, '#f9dd86', 23);
      if (e.type === 'loot') { const i = s.items.find(i=>i.id===e.itemId); if (i && ['Rare','Rainbow'].includes(i.rarity)) { const ring = this.add.circle(eventTarget+60,282,12,i.rarity === 'Rainbow' ? 0xe9a8ff : 0xffd55c,0.1).setStrokeStyle(2,i.rarity === 'Rainbow' ? 0xe9a8ff : 0xffd55c); this.tweens.add({targets:ring,scale:5,alpha:0,duration:1200,onComplete:()=>ring.destroy()}); } }
    }
    // Health below the moving Mage.
    const health = calculate(s); this.trail.fillStyle(0x0a151a); this.trail.fillRect(x-22,299,44,4); this.trail.fillStyle(0x69bfa2); this.trail.fillRect(x-22,299,44*s.hp/health.maxHp,4);
  }
  float(x: number,y: number,text: string,color: string,size: number) { const label = this.add.text(x,y,text,{fontFamily:'Georgia',fontSize:`${size}px`,color,stroke:'#111820',strokeThickness:4}).setOrigin(0.5).setDepth(10); this.tweens.add({targets:label,y:y-45,alpha:0,duration:1050,onComplete:()=>label.destroy()}); }
}
export function Dungeon() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(()=>{ const game = new Phaser.Game({type:Phaser.AUTO,parent:host.current!,width:960,height:450,backgroundColor:'#0a1116',scene:Vault,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}}); return ()=>game.destroy(true); },[]);
  return <div className="phaser-host" ref={host} aria-label="Mage automatically exploring and fighting in the Embervault" role="img"/>;
}
