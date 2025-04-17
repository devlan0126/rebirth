import Phaser from 'phaser';
import { MonsterStats } from '../scenes/GameScene';

export class Monster {
    public sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    public stats: MonsterStats;
    public moveDirection: { x: number; y: number } = { x: 0, y: 0 };
    public speed: number = 100;
    public canMove: boolean = true;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
        this.sprite = scene.physics.add.sprite(x, y, texture);
        this.sprite.setScale(0.18);
        this.sprite.setCollideWorldBounds(true);

        this.stats = {
            hp: 50,
            atk: 8,
            def: 3
        };
    }

    changeDirection() {
        if (this.canMove) {
            const directions = [
                { x: -1, y: 0 }, // 左
                { x: 1, y: 0 },  // 右
                { x: 0, y: -1 }, // 上
                { x: 0, y: 1 }   // 下
            ];
            const randomIndex = Phaser.Math.Between(0, directions.length - 1);
            this.moveDirection = directions[randomIndex];
        }
    }

    findNewDirection(playerSprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        const directions = [
            { x: -1, y: 0 }, // 左
            { x: 1, y: 0 },  // 右
            { x: 0, y: -1 }, // 上
            { x: 0, y: 1 }   // 下
        ];

        for (let i = 0; i < directions.length; i++) {
            const newDirection = directions[i];
            const testX = this.sprite.x + newDirection.x * this.speed * 0.1; // 模拟移动一小段距离
            const testY = this.sprite.y + newDirection.y * this.speed * 0.1;

            this.sprite.setPosition(testX, testY);
            const willCollide = Phaser.Geom.Intersects.RectangleToRectangle(
                this.sprite.getBounds(),
                playerSprite.getBounds()
            );
            this.sprite.setPosition(this.sprite.x - newDirection.x * this.speed * 0.1, this.sprite.y - newDirection.y * this.speed * 0.1);

            if (!willCollide) {
                this.moveDirection = newDirection;
                return;
            }
        }
        // 如果所有方向都不行，暂时停止移动
        this.moveDirection = { x: 0, y: 0 };
    }
}