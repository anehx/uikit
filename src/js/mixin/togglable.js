import {$$, addClass, Animation, assign, css, fastdom, hasAttr, hasClass, height, includes, isBoolean, isFunction, isVisible, noop, Promise, removeClass, toFloat, toggleClass, toNodes, Transition, trigger} from 'uikit-util';

export default {

    props: {
        cls: Boolean,
        animation: 'list',
        duration: Number,
        origin: String,
        transition: String
    },

    data: {
        cls: false,
        animation: [false],
        duration: 200,
        origin: false,
        transition: 'linear',

        initProps: {
            overflow: '',
            height: '',
            paddingTop: '',
            paddingBottom: '',
            marginTop: '',
            marginBottom: ''
        },

        hideProps: {
            overflow: 'hidden',
            height: 0,
            paddingTop: 0,
            paddingBottom: 0,
            marginTop: 0,
            marginBottom: 0
        }

    },

    computed: {

        hasAnimation({animation}) {
            return !!animation[0];
        },

        hasTransition({animation}) {
            return this.hasAnimation && animation[0] === true;
        },

        clsEnter() {
            return `${this.$name}-enter`;
        },

        clsLeave() {
            return `${this.$name}-leave`;
        }

    },

    methods: {

        toggleElement(targets, show, animate) {
            return Promise.all(toNodes(targets).map(el =>
                new Promise(resolve =>
                    this._toggleElement(el, show, animate).then(resolve, noop)
                )
            ));
        },

        isToggled(el = this.$el) {
            return hasClass(this.clsEnter)
                ? true
                : hasClass(this.clsLeave)
                    ? false
                    : this.cls
                        ? hasClass(el, this.cls.split(' ')[0])
                        : !hasAttr(el, 'hidden');
        },

        _toggleElement(el, show, animate) {

            show = isBoolean(show) ? show : !this.isToggled(el);

            if (!trigger(el, `before${show ? 'show' : 'hide'}`, [this])) {
                return Promise.reject();
            }

            const promise = (
                isFunction(animate)
                    ? animate
                    : animate === false || !this.hasAnimation
                        ? this._toggle
                        : this.hasTransition
                            ? toggleHeight(this)
                            : toggleAnimation(this)
            )(el, show) || Promise.resolve();

            addClass(el, show ? this.clsEnter : this.clsLeave);

            trigger(el, show ? 'show' : 'hide', [this]);

            const removeFn = () => removeClass(el, show ? this.clsEnter : this.clsLeave);
            promise.then(removeFn, removeFn);

            return promise.then(() => {
                removeClass(el, show ? this.clsEnter : this.clsLeave);
                trigger(el, show ? 'shown' : 'hidden', [this]);
                this.$update(el);
            });
        },

        _toggle(el, toggled) {

            if (!el) {
                return;
            }

            toggled = Boolean(toggled);

            let changed;
            if (this.cls) {
                changed = includes(this.cls, ' ') || toggled !== hasClass(el, this.cls);
                changed && toggleClass(el, this.cls, includes(this.cls, ' ') ? undefined : toggled);
            } else {
                changed = toggled === el.hidden;
                changed && (el.hidden = !toggled);
            }

            $$('[autofocus]', el).some(el => isVisible(el) ? el.focus() || true : el.blur());

            if (changed) {
                trigger(el, 'toggled', [toggled, this]);
                this.$update(el);
            }
        }

    }

};

export function toggleHeight({isToggled, duration, initProps, hideProps, transition, _toggle}) {
    return (el, show) => {

        const inProgress = Transition.inProgress(el);
        const inner = el.hasChildNodes ? toFloat(css(el.firstElementChild, 'marginTop')) + toFloat(css(el.lastElementChild, 'marginBottom')) : 0;
        const currentHeight = isVisible(el) ? height(el) + (inProgress ? 0 : inner) : 0;

        Transition.cancel(el);

        if (!isToggled(el)) {
            _toggle(el, true);
        }

        height(el, '');

        // Update child components first
        fastdom.flush();

        const endHeight = height(el) + (inProgress ? 0 : inner);
        height(el, currentHeight);

        return (show
            ? Transition.start(el, assign({}, initProps, {overflow: 'hidden', height: endHeight}), Math.round(duration * (1 - currentHeight / endHeight)), transition)
            : Transition.start(el, hideProps, Math.round(duration * (currentHeight / endHeight)), transition).then(() => _toggle(el, false))
        ).then(() => css(el, initProps));

    };
}

function toggleAnimation(cmp) {
    return (el, show) => {

        Animation.cancel(el);

        const {animation, duration, _toggle} = cmp;

        if (show) {
            _toggle(el, true);
            return Animation.in(el, animation[0], duration, cmp.origin);
        }

        return Animation.out(el, animation[1] || animation[0], duration, cmp.origin).then(() => _toggle(el, false));
    };
}
