import Phaser from 'phaser';
import { CharacterStats } from '../scenes/GameScene';

export class Player {
    public sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    public stats: CharacterStats;
    private originalPlayerTexture: string;
    private attackPlayerTexture: string;
    private attackAnimationKey: string;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        attackTexture: string,
        attackAnimKey: string
    ) {
        this.sprite = scene.physics.add.sprite(x, y, texture);
        this.sprite.setCollideWorldBounds(true);

        this.originalPlayerTexture = texture;
        this.attackPlayerTexture = attackTexture;
        this.attackAnimationKey = attackAnimKey;

        this.stats = {
            gender: 'male',
            hp: 100,
            mp: 50,
            atk: 10,
            def: 5,
            agi: 8,
            luc: 3,
            level: 1
        };
    }

    attack() {
        this.sprite.setTexture(this.attackPlayerTexture);
        this.sprite.anims.play(this.attackAnimationKey);
    }

    stopAttack() {
        this.sprite.setTexture(this.originalPlayerTexture);
        this.sprite.anims.stop();
    }
}