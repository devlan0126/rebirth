import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Monster } from '../objects/Monster';

// 定义并导出角色属性接口
export interface CharacterStats {
    gender: string;
    hp: number;
    mp: number;
    atk: number;
    def: number;
    agi: number;
    luc: number;
    level: number;
}

// 定义并导出怪物属性接口
export interface MonsterStats {
    hp: number;
    atk: number;
    def: number;
}

class GameScene extends Phaser.Scene {
    private player!: Player;
    private monster!: Monster;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private speed: number = 200;
    private attackAnimationKey: string = 'player_attack_anim';
    private isColliding: boolean = false;
    private lastDirection: string | null = null;
    private monsterMoveTimer!: Phaser.Time.TimerEvent;

    constructor() {
        super('GameScene');
        console.log('GameScene constructor');
    }

    create(): void {
        this.player = new Player(
            this,
            200,
            300,
            'player',
            'player_attack',
            this.attackAnimationKey
        );

        this.monster = new Monster(this, 500, 320, 'monster');

        // 启动怪物移动定时器
        this.monsterMoveTimer = this.time.addEvent({
            delay: 2000, // 每 2 秒改变一次移动方向
            callback: () => this.monster.changeDirection(),
            callbackScope: this,
            loop: true
        });

        // 监听键盘事件
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', this.attackMonster, this);
            const cursorKeys = this.input.keyboard.createCursorKeys();
            if (cursorKeys) {
                this.cursors = cursorKeys;
            }
        }

        // 创建动画
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: 1
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
            frameRate: 10,
            repeat: 1
        });

        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: 1
        });

        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: 1
        });

        // 创建攻击动画
        this.anims.create({
            key: this.attackAnimationKey,
            frames: this.anims.generateFrameNumbers('player_attack', { start: 0, end: 4 }),
            frameRate: 10,
            repeat: 1
        });

        // 创建碰撞检测
        this.physics.add.collider(this.player.sprite, this.monster.sprite, () => {
            this.isColliding = true;
        }, undefined, this);
    }

    attackMonster(): void {
        this.player.attack();

        if (this.isColliding) {
            let damage = this.player.stats.atk - this.monster.stats.def;
            if (damage < 0) {
                damage = 0;
            }

            this.monster.stats.hp -= damage;

            if (this.monster.stats.hp <= 0) {
                this.monster.sprite.destroy();
                console.log('怪物已击败！');
            } else {
                console.log(`怪物受到 ${damage} 点伤害，剩余生命值: ${this.monster.stats.hp}`);
                this.monster.canMove = false;
                // 3 秒后恢复怪物移动能力
                this.time.delayedCall(3000, () => {
                    this.monster.canMove = true;
                }, [], this);
            }
        }

        // 延迟一段时间后换回原来的图片
        this.time.delayedCall(1000, () => {
            this.player.stopAttack();
        }, [], this);
    }

    update(time: number, delta: number): void {
        let moving = false;
        let newX = this.player.sprite.x;
        let newY = this.player.sprite.y;
        let currentDirection: string | null = null;

        if (this.cursors.left.isDown) {
            newX -= this.speed * (delta / 1000);
            currentDirection = 'left';
            moving = true;
            this.player.sprite.flipX = true;
        } else if (this.cursors.right.isDown) {
            newX += this.speed * (delta / 1000);
            currentDirection = 'right';
            moving = true;
            this.player.sprite.flipX = false;
        }

        if (this.cursors.up.isDown) {
            newY -= this.speed * (delta / 1000);
            currentDirection = 'up';
            moving = true;
        } else if (this.cursors.down.isDown) {
            newY += this.speed * (delta / 1000);
            currentDirection = 'down';
            moving = true;
        }

        // 检查是否发生碰撞
        if (this.isColliding) {
            if (currentDirection && this.lastDirection && currentDirection !== this.lastDirection) {
                this.isColliding = false; // 允许往相反方向走
            } else {
                // 阻止移动
                newX = this.player.sprite.x;
                newY = this.player.sprite.y;
            }
        }

        if (moving) {
            this.lastDirection = currentDirection;
            if (currentDirection) {
                this.player.sprite.anims.play(currentDirection, true);
            }
        } else {
            // this.player.anims.stop(this.attackAnimationKey);
        }

        // 更新玩家位置
        this.player.sprite.x = newX;
        this.player.sprite.y = newY;

        // 检查怪物是否与玩家碰撞
        const isMonsterColliding = Phaser.Geom.Intersects.RectangleToRectangle(
            this.monster.sprite.getBounds(),
            this.player.sprite.getBounds()
        );

        if (isMonsterColliding) {
            this.monster.findNewDirection(this.player.sprite);
        }

        // 更新怪物位置
        if (this.monster.canMove) {
            const monsterDx = this.monster.moveDirection.x * this.monster.speed * (delta / 1000);
            const monsterDy = this.monster.moveDirection.y * this.monster.speed * (delta / 1000);

            const newMonsterX = this.monster.sprite.x + monsterDx;
            const newMonsterY = this.monster.sprite.y + monsterDy;

            if (newMonsterX >= 0 && newMonsterX <= Number(this.game.config.width) &&
                newMonsterY >= 0 && newMonsterY <= Number(this.game.config.height)) {
                this.monster.sprite.x = newMonsterX;
                this.monster.sprite.y = newMonsterY;
            }
        }
    }

    getDirectionFromKeys(): string | null {
        if (this.cursors.left.isDown) {
            return 'left';
        } else if (this.cursors.right.isDown) {
            return 'right';
        } else if (this.cursors.up.isDown) {
            return 'up';
        } else if (this.cursors.down.isDown) {
            return 'down';
        }
        return null;
    }
}

export default GameScene;