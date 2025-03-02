import AssetManager from "common/asset/normal/AssetManager";
import Color from "game/engine/logic/Color";
import Rect from "game/engine/logic/Rect";
import Vec2 from "game/engine/logic/Vec2";
import Vec3 from "game/engine/logic/Vec3";
import GameObject from "game/engine/obj/GameObject";
import RenderInfo from "game/engine/RenderInfo";
import { mat4 } from "gl-matrix";
import RotMGObject from "./RotMGObject";

export type ParticleOptions = {
	target: Vec2 | GameObject;
	lifetime: number;
	color: Color;
	scale?: number;
	delta?: Vec3;
	offset?: Vec2;
}

export default class Particle extends RotMGObject {
	lifetime: number = 0;
	color: Color = Color.Red;
	scale: number = 1.2;
	movement: Vec3 = Vec3.Zero;
	offset: Vec2 = Vec2.Zero;
	basePosition?: Vec2;
	target?: GameObject

	constructor(options: ParticleOptions) {
		super();
		if (options.target instanceof Vec2) {
			this.position = options.target;
			this.basePosition = this.position;
		} else {
			this.position = options.target.position;
			this.target = options.target;
			this.offset = options.offset ?? Vec2.Zero
		}
		this.scale = options.scale ?? 1.2;
		this.lifetime = options.lifetime;
		this.color = options.color;
		if (options.delta !== undefined) this.movement = options.delta;
	}

	update(elapsed: number) {
		super.update(elapsed);

		this.offset = this.offset.add(new Vec2(this.movement.x * 0.001 * elapsed, this.movement.y * 0.001 * elapsed))
		this.z += this.movement.z * 0.001 * elapsed;

		if (this.target !== undefined) {
			this.position = this.target.position.add(this.offset);
		} else if (this.basePosition !== undefined) {
			this.position = this.basePosition.add(this.offset);
		}
		
		if (this.lifetime < this.time) {
			this.delete();
		}
	}

	collidesWith() { return false; }
	canCollideWith() { return false; }

	render(info: RenderInfo) {
		const { gl, program } = info;

		const posBuffer = info.manager.bufferManager.getBuffer();
		const base = Rect.Zero.expand(0.1, 0.1);
		const outline = Rect.Zero.expand(0.15, 0.15);

		const draw = (rect: Rect, color: Color) => {
			gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rect.toVerts(false)), gl.STATIC_DRAW);
			gl.vertexAttribPointer(
				gl.getAttribLocation(program, "aVertexPosition"),
				2,
				gl.FLOAT,
				false,
				0,
				0
			)

			gl.enableVertexAttribArray(gl.getAttribLocation(program, "aVertexPosition"));
			gl.uniform4f(gl.getUniformLocation(program, "uColor"), color.r, color.g, color.b, color.a);
			gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, this.getModelViewMatrix());
			{
				const offset = 0;
				const vertexCount = 4;
				gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
			}
		}

		draw(outline, Color.Black);
		draw(base, this.color);


		info.manager.bufferManager.finish()
	}

	getModelViewMatrix() {
		const mat = mat4.create();

		mat4.translate(mat, mat, [this.position.x, this.position.y, this.z])
		mat4.scale(mat, mat, [this.scale, this.scale, 1]);

		return mat;
	}

	getProgram(manager: AssetManager) {
		return manager.get<WebGLProgram>("programs", "billboard/color")?.value;
	}
}