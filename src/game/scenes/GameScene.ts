import Phaser from 'phaser';

// 定义角色属性接口
interface CharacterStats {
    gender: string;
    hp: number;
    mp: number;
    atk: number;
    def: number;
    agi: number;
    luc: number;
    level: number;
}

// 定义怪物属性接口
interface MonsterStats {
    hp: number;
    atk: number;
    def: number;
}

class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private monster!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private playerStats!: CharacterStats;
    private monsterStats!: MonsterStats;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys; // 新增：用于存储键盘方向键对象
    private speed: number = 200;
    private originalPlayerTexture: string = 'player'; // 存储玩家原始图片的键名
    private attackPlayerTexture: string = 'player_attack'; // 存储玩家攻击时图片的键名
    private attackAnimationKey: string = 'player_attack_anim';
    private attackCollider!: Phaser.Physics.Arcade.Collider;
    private isColliding: boolean = false; // 新增：用于存储是否发生碰撞的状态
    private collisionThreshold: number = 50; // 碰撞阈值
    private lastDirection: string | null = null; // 记录玩家最后一次移动的方向


    constructor() {
        super('GameScene');
        console.log('GameScene constructor');
    }

    create(): void {
        // 启动物理引擎
        // this.physics.start();
        // 创建角色
        this.player = this.physics.add.sprite(200, 300, 'player');
        this.player.setCollideWorldBounds(true)

        // 创建怪物
        this.monster = this.physics.add.sprite(500, 320, 'monster');
        this.monster.setScale(0.18);
        this.monster.setCollideWorldBounds(true);

        // 初始化角色属性
        this.playerStats = {
            gender: 'male',
            hp: 100,
            mp: 50,
            atk: 10,
            def: 5,
            agi: 8,
            luc: 3,
            level: 1
        };

        // 初始化怪物属性
        this.monsterStats = {
            hp: 50,
            atk: 8,
            def: 3
        };

        // 监听键盘事件
        // 添加空值检查，避免对象为 null 的情况
        const cursorKeys = this.input.keyboard?.createCursorKeys();
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', this.attackMonster, this);
        }

        // 新增：创建键盘方向键对象
        // 添加空值检查，避免对象为 null 的情况
        // 移除重复声明，直接使用之前声明的 cursorKeys 变量
        // const cursorKeys = this.input.keyboard?.createCursorKeys();
        if (cursorKeys) {
            this.cursors = cursorKeys;
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
            // defaultTextureKey: this.attackPlayerTexture,
            frameRate: 10,
            repeat: 1
        });

        // 创建碰撞检测
        // this.physics.add.collider(this.player, this.monster);
        // 创建碰撞检测
        this.physics.add.collider(this.player, this.monster, () => {
            this.isColliding = true;
        }, undefined, this);
    }

    attackMonster(): void {
        // // 更换为攻击图片
        this.player.setTexture(this.attackPlayerTexture);
        // 播放攻击动画
        this.player.anims.play(this.attackAnimationKey);
        // 检查碰撞
        if (this.isColliding) {
            // 计算攻击伤害
            let damage = this.playerStats.atk - this.monsterStats.def;
            if (damage < 0) {
                damage = 0;
            }

            // 减少怪物生命值
            this.monsterStats.hp -= damage;

            if (this.monsterStats.hp <= 0) {
                // 怪物死亡
                this.monster.destroy();
                console.log('怪物已击败！');
            } else {
                console.log(`怪物受到 ${damage} 点伤害，剩余生命值: ${this.monsterStats.hp}`);
            }
        }

        // 延迟一段时间后换回原来的图片
        this.time.delayedCall(1000, () => {
            this.player.setTexture(this.originalPlayerTexture);
            this.player.anims.stop()
        }, [], this);
    }

    update(time: number, delta: number): void {
        let moving = false;
        let newX = this.player.x;
        let newY = this.player.y;
        let currentDirection: string | null = null;

        if (this.cursors.left.isDown) {
            newX -= this.speed * (delta / 1000);
            currentDirection = 'left';
            moving = true;
            this.player.flipX = true;
        } else if (this.cursors.right.isDown) {
            newX += this.speed * (delta / 1000);
            currentDirection = 'right';
            moving = true;
            this.player.flipX = false;
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
                newX = this.player.x;
                newY = this.player.y;
            }
        }

        if (moving) {
            this.lastDirection = currentDirection;
            if (currentDirection) {
                this.player.anims.play(currentDirection, true);
            }
        } else {
            // this.player.anims.stop(this.attackAnimationKey);
        }

        // 更新玩家位置
        this.player.x = newX;
        this.player.y = newY;
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