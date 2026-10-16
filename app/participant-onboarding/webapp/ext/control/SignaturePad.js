sap.ui.define([
    'sap/ui/core/Control'
], function (Control) {
    'use strict';

    return Control.extend('neo.energy.participantonboarding.ext.control.SignaturePad', {
        metadata: {
            properties: {
                value: { type: 'string', defaultValue: '' },
                presetName: { type: 'string', defaultValue: '' }
            },
            events: {
                change: {}
            }
        },

        renderer: {
            apiVersion: 2,
            render: function (renderManager, control) {
                renderManager.openStart('div', control).class('signaturePad').openEnd();
                renderManager.openStart('canvas', `${control.getId()}-canvas`)
                    .attr('aria-label', 'Unterschrift zeichnen')
                    .attr('role', 'img')
                    .openEnd()
                    .close('canvas');
                renderManager.openStart('span').class('signaturePadHint').openEnd();
                renderManager.text('Hier mit Maus, Stift oder Finger unterschreiben');
                renderManager.close('span');
                renderManager.close('div');
            }
        },

        onAfterRendering: function () {
            const canvas = document.getElementById(`${this.getId()}-canvas`);
            if (!canvas) return;
            const context = canvas.getContext('2d');
            const ratio = window.devicePixelRatio || 1;
            const bounds = canvas.getBoundingClientRect();
            canvas.width = Math.max(1, Math.round(bounds.width * ratio));
            canvas.height = Math.max(1, Math.round(bounds.height * ratio));
            context.scale(ratio, ratio);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.lineWidth = 2.25;
            context.strokeStyle = '#183632';

            const existingValue = this.getValue();
            if (existingValue) {
                const image = new Image();
                image.onload = () => context.drawImage(image, 0, 0, bounds.width, bounds.height);
                image.src = existingValue;
            } else if (this.getPresetName()) {
                context.save();
                context.font = 'italic 2.35rem cursive';
                context.fillStyle = '#183632';
                context.fillText(this.getPresetName(), 22, Math.max(62, bounds.height * 0.58));
                context.beginPath();
                context.moveTo(18, bounds.height * 0.7);
                context.bezierCurveTo(bounds.width * 0.28, bounds.height * 0.82, bounds.width * 0.6, bounds.height * 0.55, bounds.width - 28, bounds.height * 0.68);
                context.stroke();
                context.restore();
                this.setProperty('value', canvas.toDataURL('image/png'), true);
            }

            let drawing = false;
            const point = event => {
                const rectangle = canvas.getBoundingClientRect();
                return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
            };
            canvas.addEventListener('pointerdown', event => {
                drawing = true;
                canvas.setPointerCapture(event.pointerId);
                const start = point(event);
                context.beginPath();
                context.moveTo(start.x, start.y);
                event.preventDefault();
            });
            canvas.addEventListener('pointermove', event => {
                if (!drawing) return;
                const next = point(event);
                context.lineTo(next.x, next.y);
                context.stroke();
                event.preventDefault();
            });
            const finish = event => {
                if (!drawing) return;
                drawing = false;
                this.setProperty('value', canvas.toDataURL('image/png'), true);
                this.fireChange();
                event.preventDefault();
            };
            canvas.addEventListener('pointerup', finish);
            canvas.addEventListener('pointercancel', finish);
        },

        clear: function () {
            this.setProperty('value', '', true);
            const canvas = document.getElementById(`${this.getId()}-canvas`);
            if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            this.fireChange();
        },

        hasSignature: function () {
            return Boolean(this.getValue());
        }
    });
});
