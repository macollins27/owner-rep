"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
var claude_code_1 = require("claude-code");
var rep_1 = require("./rep");
// The chord that presses the Rep button from the prompt: `ctrl+x r`, bound in
// ~/.claude/keybindings.json to this engine action, which has no default key.
var PRESS_ACTION = 'app:toggleDiffPreSession';
var PRESS_HOTKEY = '1';
var IDLE = { doing: 'idle', helpers: 0, isWorking: false, mark: '' };
var goalA = (0, claude_code_1.atom)({ plugin: 'owner-rep', key: 'goal' }, null);
var pinnedA = (0, claude_code_1.atom)({ plugin: 'owner-rep', key: 'isPinned' }, false);
var nowA = (0, claude_code_1.atom)({ plugin: 'owner-rep', key: 'now' }, IDLE);
var noteA = (0, claude_code_1.atom)({ plugin: 'owner-rep', key: 'note' }, null);
var briefA = (0, claude_code_1.atom)({ plugin: 'owner-rep', key: 'brief' }, null);
var viewA = (0, claude_code_1.atom)({ plugin: 'owner-rep', key: 'view' }, 'row');
var helpersA = (0, claude_code_1.atom)({ plugin: 'owner-rep', key: 'helperIds' }, []);
var isRec = function (v) {
    return typeof v === 'object' && v !== null && typeof v.id === 'string' && Array.isArray(v.owner);
};
var freshRec = function (id) { return ({
    id: id,
    at: Date.now(),
    goal: null,
    isPinned: false,
    owner: [],
    seen: [],
    others: [],
    typedPast: 0,
    skip: 0,
    calls: 0,
    tokens: 0,
    cached: 0,
    checks: 0,
    checkTokens: 0,
    lastCheckTokens: 0,
    lastCheckCached: 0,
    lastCheckMs: 0,
}); };
function loadRec($, id) {
    return __awaiter(this, void 0, void 0, function () {
        var all, rec;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.store.get('sessions')];
                case 1:
                    all = _a.sent();
                    rec = typeof all === 'object' && all !== null ? all[id] : undefined;
                    return [2 /*return*/, isRec(rec) ? __assign(__assign({}, freshRec(id)), rec) : freshRec(id)];
            }
        });
    });
}
function saveRec($, rec) {
    return __awaiter(this, void 0, void 0, function () {
        var got, all, _i, _a, _b, k, v, ids, kept, _c, _d, k;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, $.store.get('sessions')];
                case 1:
                    got = _e.sent();
                    all = {};
                    if (typeof got === 'object' && got !== null) {
                        for (_i = 0, _a = Object.entries(got); _i < _a.length; _i++) {
                            _b = _a[_i], k = _b[0], v = _b[1];
                            if (isRec(v))
                                all[k] = v;
                        }
                    }
                    all[rec.id] = __assign(__assign({}, rec), { at: Date.now() });
                    ids = Object.keys(all).sort(function (a, b) { var _a, _b, _c, _d; return ((_b = (_a = all[b]) === null || _a === void 0 ? void 0 : _a.at) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = all[a]) === null || _c === void 0 ? void 0 : _c.at) !== null && _d !== void 0 ? _d : 0); });
                    kept = {};
                    for (_c = 0, _d = ids.slice(0, rep_1.SESSIONS_MAX); _c < _d.length; _c++) {
                        k = _d[_c];
                        kept[k] = all[k];
                    }
                    return [4 /*yield*/, $.store.set('sessions', kept)];
                case 2:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    });
}
var memoryOf = function (rec) { return ({
    goal: rec.goal,
    isPinned: rec.isPinned,
    owner: rec.owner,
    seen: rec.seen,
    others: rec.others,
    lastBrief: rec.lastBrief,
    lastSent: rec.lastSent,
}); };
function setNow($, patch) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.update)($, nowA, function (n) { return (__assign(__assign({}, (n !== null && n !== void 0 ? n : IDLE)), patch)); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// One look by the watch: the same cached copy of the conversation the agent
// works from, read by a fresh instance with the rep's brief. Never awaited by
// the hook that starts it, so the agent is never slowed.
function look($, sid, reason, turnId) {
    return __awaiter(this, void 0, void 0, function () {
        var rec, result, after, answer, view, note_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadRec($, sid)];
                case 1:
                    rec = _a.sent();
                    if (!(rec.skip > 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, saveRec($, __assign(__assign({}, rec), { skip: rec.skip - 1 }))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
                case 3: return [4 /*yield*/, $.model.fork({ prompt: (0, rep_1.watchPrompt)(memoryOf(rec), reason) })];
                case 4:
                    result = _a.sent();
                    return [4 /*yield*/, loadRec($, sid)];
                case 5:
                    after = _a.sent();
                    after.calls += 1;
                    after.tokens += (0, rep_1.tokensOf)('usage' in result ? result.usage : null);
                    after.cached += (0, rep_1.cachedOf)('usage' in result ? result.usage : null);
                    if (!!result.isAnswered) return [3 /*break*/, 7];
                    return [4 /*yield*/, saveRec($, after)];
                case 6:
                    _a.sent();
                    return [2 /*return*/];
                case 7:
                    answer = (0, rep_1.parseWatch)(result.text);
                    if (!(answer.goal !== null && !after.isPinned)) return [3 /*break*/, 9];
                    after.goal = answer.goal;
                    return [4 /*yield*/, (0, claude_code_1.update)($, goalA, function () { return answer.goal; })];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9: return [4 /*yield*/, (0, claude_code_1.read)($, viewA)];
                case 10:
                    view = _a.sent();
                    if (!(answer.flag !== null && view === 'row' && !__spreadArray([], after.seen, true).some(function (s) { var _a; return (0, rep_1.same)(s, (_a = answer.flag) !== null && _a !== void 0 ? _a : ''); }))) return [3 /*break*/, 13];
                    after.seen = __spreadArray(__spreadArray([], after.seen, true), [answer.flag], false).slice(-rep_1.SEEN_MAX);
                    note_1 = { line: answer.flag, why: answer.why, shownAt: Date.now(), turnId: turnId };
                    return [4 /*yield*/, (0, claude_code_1.update)($, noteA, function () { return note_1; })];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function () { return 'note'; })];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13: return [4 /*yield*/, saveRec($, after)];
                case 14:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// The press: an instant read over the same copy, drawn in the band.
function pressBrief($, sid) {
    return __awaiter(this, void 0, void 0, function () {
        var view, rec, result, after, a_1, brief_1, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.read)($, viewA)];
                case 1:
                    view = _d.sent();
                    if (view === 'reading')
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function () { return 'reading'; })];
                case 2:
                    _d.sent();
                    return [4 /*yield*/, setNow($, { mark: '' }).catch(function () { return undefined; })];
                case 3:
                    _d.sent();
                    _d.label = 4;
                case 4:
                    _d.trys.push([4, 17, , 19]);
                    return [4 /*yield*/, loadRec($, sid)];
                case 5:
                    rec = _d.sent();
                    return [4 /*yield*/, $.model.fork({ prompt: (0, rep_1.briefPrompt)(memoryOf(rec)) })];
                case 6:
                    result = _d.sent();
                    return [4 /*yield*/, loadRec($, sid)];
                case 7:
                    after = _d.sent();
                    after.calls += 1;
                    after.tokens += (0, rep_1.tokensOf)('usage' in result ? result.usage : null);
                    after.cached += (0, rep_1.cachedOf)('usage' in result ? result.usage : null);
                    if (!!result.isAnswered) return [3 /*break*/, 10];
                    return [4 /*yield*/, saveRec($, after)];
                case 8:
                    _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function () { return 'row'; })];
                case 9:
                    _d.sent();
                    $.ui.toast(result.reason === 'nothing-to-fork'
                        ? 'Owner rep: nothing to read yet. Ask the agent something first.'
                        : "Owner rep: the model did not answer (".concat(result.reason, "). Press again."));
                    return [2 /*return*/];
                case 10:
                    a_1 = (0, rep_1.parseBrief)(result.text);
                    if (!(a_1.goal !== null && !after.isPinned)) return [3 /*break*/, 12];
                    after.goal = a_1.goal;
                    return [4 /*yield*/, (0, claude_code_1.update)($, goalA, function () { return a_1.goal; })];
                case 11:
                    _d.sent();
                    _d.label = 12;
                case 12:
                    brief_1 = {
                        goal: (_c = (_b = after.goal) !== null && _b !== void 0 ? _b : a_1.goal) !== null && _c !== void 0 ? _c : '',
                        well: a_1.well,
                        stands: a_1.stands,
                        means: a_1.means,
                        leftOut: a_1.leftOut,
                        next: a_1.next,
                        message: a_1.message,
                        does: a_1.does,
                        at: Date.now(),
                        spent: (0, rep_1.spentText)(after.calls, after.tokens, after.cached, after.checks, after.checkTokens),
                        isChecking: false,
                        checked: null,
                        checkNote: '',
                        checkCost: (0, rep_1.checkCostText)(after.lastCheckTokens, after.lastCheckCached, after.lastCheckMs),
                    };
                    after.lastBrief = { at: brief_1.at, next: brief_1.next, message: brief_1.message };
                    return [4 /*yield*/, saveRec($, after)];
                case 13:
                    _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, noteA, function () { return null; })];
                case 14:
                    _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, briefA, function () { return brief_1; })];
                case 15:
                    _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function () { return 'brief'; })];
                case 16:
                    _d.sent();
                    lastInstant = { at: brief_1.at, answer: a_1 };
                    return [3 /*break*/, 19];
                case 17:
                    _a = _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function () { return 'row'; })];
                case 18:
                    _d.sent();
                    $.ui.toast('Owner rep: the reading failed. Press again.');
                    return [3 /*break*/, 19];
                case 19: return [2 /*return*/];
            }
        });
    });
}
// Whether the checker's answer carried a "left:" part at all; an absent part
// keeps the instant read's list, an empty one ("- nothing") clears it.
var parts_hasLeft = function (text) { return /^\s*left:/im.test(text); };
// The check step: a separate headless Claude Code run with read-only tools,
// agentsview and the files. It starts after the instant read is on screen and
// rewrites the card when it returns. A newer press makes an older run's answer
// stale, and a reload of this module kills the child.
var checkEpoch = 0;
var activeCheck = null;
// The instant read the card was drawn from, kept for "Check it".
var lastInstant = null;
// "Check it": the owner chose to pay for the check on the card that is up.
function pressCheck($, sid) {
    return __awaiter(this, void 0, void 0, function () {
        var b;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.read)($, briefA)];
                case 1:
                    b = _a.sent();
                    if (b === null || lastInstant === null || lastInstant.at !== b.at) {
                        $.ui.toast('Owner rep: press Brief me first, then Check it.');
                        return [2 /*return*/];
                    }
                    if (b.isChecking)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, claude_code_1.update)($, briefA, function (x) { return (x === null ? x : __assign(__assign({}, x), { isChecking: true, checkNote: '' })); })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, runCheck($, sid, b.at, lastInstant.answer)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function runCheck($, sid, at, instant) {
    return __awaiter(this, void 0, void 0, function () {
        var epoch, isStale, finish, rec, cwd, prompt_1, startedAt, stream_1, stdout, stderr, timedOut_1, close_1, stop_1, end, piece, got, why, after, c, checked, hasLeft, patch, error_1, why;
        var _this = this;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    epoch = ++checkEpoch;
                    activeCheck === null || activeCheck === void 0 ? void 0 : activeCheck.stop();
                    activeCheck = null;
                    isStale = function () { return __awaiter(_this, void 0, void 0, function () {
                        var b;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, claude_code_1.read)($, briefA)];
                                case 1:
                                    b = _a.sent();
                                    return [2 /*return*/, epoch !== checkEpoch || b === null || b.at !== at];
                            }
                        });
                    }); };
                    finish = function (patch) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, isStale()];
                                case 1:
                                    if (_a.sent())
                                        return [2 /*return*/];
                                    return [4 /*yield*/, (0, claude_code_1.update)($, briefA, function (b) { return (b === null ? b : __assign(__assign(__assign({}, b), patch), { isChecking: false })); })];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 14, , 16]);
                    return [4 /*yield*/, loadRec($, sid)];
                case 2:
                    rec = _e.sent();
                    return [4 /*yield*/, $.session.cwd()];
                case 3:
                    cwd = _e.sent();
                    prompt_1 = (0, rep_1.checkPrompt)({
                        sessionId: sid,
                        cwd: cwd,
                        goal: (_a = rec.goal) !== null && _a !== void 0 ? _a : '',
                        owner: rec.owner,
                        brief: instant,
                        writtenAt: new Date(at).toISOString(),
                    });
                    startedAt = Date.now();
                    stream_1 = $.process.spawn({ argv: (0, rep_1.checkArgv)(prompt_1), cwd: cwd });
                    stdout = '';
                    stderr = '';
                    timedOut_1 = false;
                    close_1 = function (signal) {
                        stream_1.return({ code: null, signal: signal }).catch(function () { return undefined; });
                    };
                    activeCheck = { stop: function () { return close_1('replaced'); } };
                    stop_1 = $.clock.after(rep_1.CHECK_TIMEOUT_MS, function () {
                        timedOut_1 = true;
                        close_1('timeout');
                    });
                    end = { code: null, signal: null };
                    _e.label = 4;
                case 4:
                    _e.trys.push([4, , 9, 10]);
                    _e.label = 5;
                case 5: return [4 /*yield*/, stream_1.next()];
                case 6:
                    piece = _e.sent();
                    if (piece.done) {
                        end = piece.value;
                        return [3 /*break*/, 8];
                    }
                    if (piece.value.stream === 'stdout')
                        stdout += piece.value.text;
                    else
                        stderr += piece.value.text;
                    _e.label = 7;
                case 7: return [3 /*break*/, 5];
                case 8: return [3 /*break*/, 10];
                case 9:
                    stop_1.cancel();
                    if (activeCheck !== null && epoch === checkEpoch)
                        activeCheck = null;
                    return [7 /*endfinally*/];
                case 10:
                    if (timedOut_1)
                        return [2 /*return*/, finish({ checkNote: 'The check ran out of time (five minutes) and was stopped.' })];
                    got = (0, rep_1.resultOf)(stdout);
                    if (got === null) {
                        why = (_b = stderr.trim().split('\n').pop()) !== null && _b !== void 0 ? _b : '';
                        return [2 /*return*/, finish({ checkNote: "The check could not run".concat(end.code === null ? '' : " (exit ".concat(end.code, ")")).concat(why === '' ? '' : ": ".concat((0, rep_1.fit)(why, 160)), ".") })];
                    }
                    return [4 /*yield*/, loadRec($, sid)];
                case 11:
                    after = _e.sent();
                    after.checks += 1;
                    after.checkTokens += got.tokens;
                    after.lastCheckTokens = got.tokens;
                    after.lastCheckCached = got.cached;
                    after.lastCheckMs = Date.now() - startedAt;
                    c = (0, rep_1.parseCheck)(got.text);
                    checked = { holds: c.holds, wrong: c.wrong, notShown: c.notShown, changed: c.changed, looked: c.looked };
                    hasLeft = parts_hasLeft(got.text);
                    patch = {
                        checked: checked,
                        stands: c.stands === '' ? instant.stands : c.stands,
                        means: c.means === '' ? instant.means : c.means,
                        leftOut: hasLeft ? c.leftOut : instant.leftOut,
                        next: c.next === '' ? instant.next : c.next,
                        message: c.message === '' ? instant.message : c.message,
                        does: c.does === '' ? instant.does : c.does,
                        spent: (0, rep_1.spentText)(after.calls, after.tokens, after.cached, after.checks, after.checkTokens),
                        checkCost: (0, rep_1.checkCostText)(after.lastCheckTokens, after.lastCheckCached, after.lastCheckMs),
                    };
                    after.lastBrief = { at: at, next: (_c = patch.next) !== null && _c !== void 0 ? _c : '', message: (_d = patch.message) !== null && _d !== void 0 ? _d : '' };
                    return [4 /*yield*/, saveRec($, after)];
                case 12:
                    _e.sent();
                    return [4 /*yield*/, finish(patch)];
                case 13:
                    _e.sent();
                    return [3 /*break*/, 16];
                case 14:
                    error_1 = _e.sent();
                    why = error_1 instanceof Error ? error_1.message : String(error_1);
                    return [4 /*yield*/, finish({ checkNote: "The check failed: ".concat((0, rep_1.fit)(why, 160)) }).catch(function () { return undefined; })];
                case 15:
                    _e.sent();
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
function putMessage($, text) {
    return __awaiter(this, void 0, void 0, function () {
        var box, filled;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.prompt.read()];
                case 1:
                    box = _a.sent();
                    if (box.text.trim() !== '') {
                        $.ui.toast('Your prompt box has text in it. Send or clear it, then press 1 again.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, $.prompt.fill({ text: text, mode: 'replace' })];
                case 2:
                    filled = _a.sent();
                    if (!filled.isFilled) {
                        $.ui.toast(filled.refusal === 'dialog'
                            ? 'A dialog has the keyboard. Answer it, then press 1 again.'
                            : 'The prompt box did not take the message. Press 1 again.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function () { return 'row'; })];
                case 3:
                    _a.sent();
                    $.ui.toast('The message is in your prompt box. Enter sends it; nothing is sent until you do.');
                    return [2 /*return*/];
            }
        });
    });
}
function pinGoal($, sid, text) {
    return __awaiter(this, void 0, void 0, function () {
        var goal, rec;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    goal = text.trim();
                    return [4 /*yield*/, loadRec($, sid)];
                case 1:
                    rec = _a.sent();
                    if (!(goal === '')) return [3 /*break*/, 3];
                    rec.isPinned = false;
                    return [4 /*yield*/, (0, claude_code_1.update)($, pinnedA, function () { return false; })];
                case 2:
                    _a.sent();
                    $.ui.toast('Owner rep will work the result out again from your messages.');
                    return [3 /*break*/, 6];
                case 3:
                    rec.goal = goal;
                    rec.isPinned = true;
                    return [4 /*yield*/, (0, claude_code_1.update)($, goalA, function () { return goal; })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, pinnedA, function () { return true; })];
                case 5:
                    _a.sent();
                    $.ui.toast('Pinned. The rep measures against your sentence now.');
                    _a.label = 6;
                case 6: return [4 /*yield*/, saveRec($, rec)];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// "Fix the goal": the sentence goes into the owner's own prompt box, where he
// edits it and presses Enter; the prompt.submit hook takes it and drops it, so
// the agent never sees it.
function askGoal($, goal) {
    return __awaiter(this, void 0, void 0, function () {
        var box, filled;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.prompt.read()];
                case 1:
                    box = _a.sent();
                    if (box.text.trim() !== '') {
                        $.ui.toast('Your prompt box has text in it. Send or clear it, then press again.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, $.prompt.fill({ text: "".concat(rep_1.GOAL_PREFIX, " ").concat(goal !== null && goal !== void 0 ? goal : ''), mode: 'replace' })];
                case 2:
                    filled = _a.sent();
                    if (!filled.isFilled) {
                        $.ui.toast('The prompt box did not take it. Press again.');
                        return [2 /*return*/];
                    }
                    $.ui.toast('Edit the sentence in your prompt box and press Enter. Only the rep reads it; empty unpins.');
                    return [2 /*return*/];
            }
        });
    });
}
// What another mod showed in the strip, kept so the rep never repeats it.
var lastOther = '';
function rememberOther($, id, text) {
    return __awaiter(this, void 0, void 0, function () {
        var line, rec;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    line = text.replace(/\s+/g, ' ').trim();
                    if (line === '' || line === lastOther || id === '')
                        return [2 /*return*/];
                    lastOther = line;
                    return [4 /*yield*/, loadRec($, id)];
                case 1:
                    rec = _a.sent();
                    if (rec.others.some(function (o) { return (0, rep_1.same)(o, line); }))
                        return [2 /*return*/];
                    rec.others = __spreadArray(__spreadArray([], rec.others, true), [(0, rep_1.fit)(line, 400)], false).slice(-rep_1.OTHERS_MAX);
                    return [4 /*yield*/, saveRec($, rec)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function clearNote($) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.update)($, noteA, function () { return null; })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function () { return 'row'; })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Whether a tree another mod or the engine returned for the band draws
// anything the person can see: text, a control or a picture. Empty boxes,
// fragments and empty text draw nothing.
function drawsSomething(tree) {
    var _a, _b;
    if (tree === undefined || tree === null || typeof tree === 'boolean')
        return false;
    if (typeof tree === 'string')
        return tree.trim() !== '';
    if (typeof tree === 'number')
        return true;
    if (Array.isArray(tree))
        return tree.some(drawsSomething);
    if (typeof tree === 'object') {
        var t = tree;
        var kids = (_b = (_a = t.props) === null || _a === void 0 ? void 0 : _a.children) !== null && _b !== void 0 ? _b : t.children;
        switch (t.type) {
            case 'Button':
            case 'Input':
            case 'Select':
            case 'Image':
            case 'Raster':
            case 'Svg':
            case 'Client':
            case 'Code':
            case 'Markdown':
            case 'Link':
                return true;
            default:
                return drawsSomething(kids);
        }
    }
    return false;
}
// The session's id, read once per load of the module.
var sid = '';
function sessionId($) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(sid === '')) return [3 /*break*/, 2];
                    return [4 /*yield*/, $.session.id()];
                case 1:
                    sid = _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, sid];
            }
        });
    });
}
var register = function (on) {
    var lastDoing = '';
    var promptsPastNote = 0;
    var inFlight = new Set();
    on('session.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var id, rec_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, sessionId($)];
                case 1:
                    id = _b.sent();
                    return [4 /*yield*/, loadRec($, id)];
                case 2:
                    rec_1 = _b.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, goalA, function () { return rec_1.goal; })];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, pinnedA, function () { return rec_1.isPinned; })];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function (v) { return (v === 'reading' ? 'row' : (v !== null && v !== void 0 ? v : 'row')); })];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, setNow($, { isWorking: false, doing: 'idle', mark: '' })];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _a = _b.sent();
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/, next(e)];
            }
        });
    }); });
    on('prompt.submit', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var kind, typedGoal, _a, _b, id, rec, view, brief, _c;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    kind = (_e = (_d = e.origin) === null || _d === void 0 ? void 0 : _d.kind) !== null && _e !== void 0 ? _e : 'composer';
                    if (!(kind === 'composer' || kind === 'bridge')) return [3 /*break*/, 14];
                    typedGoal = (0, rep_1.goalTyped)(e.text);
                    if (!(typedGoal !== null)) return [3 /*break*/, 3];
                    _a = pinGoal;
                    _b = [$];
                    return [4 /*yield*/, sessionId($)];
                case 1: return [4 /*yield*/, _a.apply(void 0, _b.concat([_f.sent(), typedGoal])).catch(function () { return undefined; })];
                case 2:
                    _f.sent();
                    return [2 /*return*/, { drop: typedGoal === '' ? 'Owner rep: unpinned; the rep works the result out again.' : 'Owner rep: pinned. The agent did not see this.' }];
                case 3:
                    _f.trys.push([3, 13, , 14]);
                    return [4 /*yield*/, sessionId($)];
                case 4:
                    id = _f.sent();
                    return [4 /*yield*/, loadRec($, id)];
                case 5:
                    rec = _f.sent();
                    rec.owner = __spreadArray(__spreadArray([], rec.owner, true), [(0, rep_1.fit)(e.text, rep_1.OWNER_CUT)], false).slice(-rep_1.OWNER_MAX);
                    return [4 /*yield*/, (0, claude_code_1.read)($, viewA)];
                case 6:
                    view = _f.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, briefA)];
                case 7:
                    brief = _f.sent();
                    if (!(brief !== null && brief.message !== '' && (0, rep_1.same)(e.text, brief.message))) return [3 /*break*/, 9];
                    rec.lastSent = { text: brief.message, at: Date.now() };
                    if (!(view === 'brief')) return [3 /*break*/, 9];
                    return [4 /*yield*/, (0, claude_code_1.update)($, viewA, function () { return 'row'; })];
                case 8:
                    _f.sent();
                    _f.label = 9;
                case 9:
                    if (!(view === 'note')) return [3 /*break*/, 11];
                    promptsPastNote += 1;
                    if (!(promptsPastNote >= rep_1.CLEAR_AFTER_PROMPTS)) return [3 /*break*/, 11];
                    promptsPastNote = 0;
                    rec.typedPast += 1;
                    rec.skip = (0, rep_1.skipAfter)(rec.typedPast);
                    return [4 /*yield*/, clearNote($)];
                case 10:
                    _f.sent();
                    _f.label = 11;
                case 11: return [4 /*yield*/, saveRec($, rec)];
                case 12:
                    _f.sent();
                    return [3 /*break*/, 14];
                case 13:
                    _c = _f.sent();
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/, next(e)];
            }
        });
    }); });
    on('turn.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lastDoing = 'thinking';
                    return [4 /*yield*/, setNow($, { isWorking: true, doing: 'thinking', mark: '' }).catch(function () { return undefined; })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, next(e)];
            }
        });
    }); });
    on('tool.call', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var tool, doing, waits, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (e.agentId !== undefined)
                        return [2 /*return*/, next(e)];
                    tool = String(e.tool);
                    doing = (0, rep_1.doingFor)(tool, e);
                    waits = tool === 'AskUserQuestion' || tool === 'ExitPlanMode';
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    if (!(doing !== lastDoing || waits)) return [3 /*break*/, 3];
                    lastDoing = doing;
                    return [4 /*yield*/, setNow($, waits ? { doing: doing, mark: doing } : { doing: doing })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 5:
                    _b.trys.push([5, , 7, 10]);
                    return [4 /*yield*/, next(e)];
                case 6: return [2 /*return*/, _b.sent()];
                case 7:
                    if (!waits) return [3 /*break*/, 9];
                    lastDoing = 'working';
                    return [4 /*yield*/, setNow($, { doing: 'working', mark: '' }).catch(function () { return undefined; })];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9: return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    }); });
    on('agent.spawn', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var result, id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    result = _a.sent();
                    id = result.agentId;
                    if (!(id !== undefined)) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, claude_code_1.update)($, helpersA, function (ids) { return __spreadArray(__spreadArray([], (ids !== null && ids !== void 0 ? ids : []), true), [id], false); }).catch(function () { return undefined; })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, nowA, function (n) { var _a; return (__assign(__assign({}, (n !== null && n !== void 0 ? n : IDLE)), { helpers: ((_a = n === null || n === void 0 ? void 0 : n.helpers) !== null && _a !== void 0 ? _a : 0) + 1 })); }).catch(function () { return undefined; })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/, result];
            }
        });
    }); });
    on('turn.step', function ($, e, next) {
        return __asyncGenerator(this, arguments, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(e.agentId !== undefined)) return [3 /*break*/, 4];
                        return [5 /*yield**/, __values(__asyncDelegator(__asyncValues(next(e))))];
                    case 1: return [4 /*yield*/, __await.apply(void 0, [_a.sent()])];
                    case 2: return [4 /*yield*/, __await.apply(void 0, [_a.sent()])];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        if (e.index > 0 && e.index % rep_1.CHECK_EVERY === 0 && !inFlight.has('look')) {
                            inFlight.add('look');
                            sessionId($)
                                .then(function (id) { return look($, id, 'step', e.turnId); })
                                .catch(function () { return undefined; })
                                .finally(function () { return inFlight.delete('look'); });
                        }
                        return [5 /*yield**/, __values(__asyncDelegator(__asyncValues(next(e))))];
                    case 5: return [4 /*yield*/, __await.apply(void 0, [_a.sent()])];
                    case 6: return [4 /*yield*/, __await.apply(void 0, [_a.sent()])];
                    case 7: return [2 /*return*/, _a.sent()];
                }
            });
        });
    });
    on('turn.complete', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var gone_1, asking, doing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(e.agentId !== undefined)) return [3 /*break*/, 3];
                    gone_1 = e.agentId;
                    return [4 /*yield*/, (0, claude_code_1.update)($, helpersA, function (ids) { return (ids !== null && ids !== void 0 ? ids : []).filter(function (i) { return i !== gone_1; }); }).catch(function () { return undefined; })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, nowA, function (n) { var _a; return (__assign(__assign({}, (n !== null && n !== void 0 ? n : IDLE)), { helpers: Math.max(0, ((_a = n === null || n === void 0 ? void 0 : n.helpers) !== null && _a !== void 0 ? _a : 0) - 1) })); }).catch(function () { return undefined; })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, next(e)];
                case 3:
                    asking = /\?\s*$/.test(e.answer.trim());
                    doing = e.isAborted ? 'stopped by you' : asking ? 'asking you' : 'stopped, waiting on you';
                    lastDoing = doing;
                    return [4 /*yield*/, setNow($, { isWorking: false, doing: doing, mark: e.isAborted ? '' : asking ? 'asking' : 'stopped' }).catch(function () { return undefined; })];
                case 4:
                    _a.sent();
                    if (!e.isAborted && !inFlight.has('look')) {
                        inFlight.add('look');
                        sessionId($)
                            .then(function (id) { return look($, id, 'stop', e.turnId); })
                            .catch(function () { return undefined; })
                            .finally(function () { return inFlight.delete('look'); });
                    }
                    return [2 /*return*/, next(e)];
            }
        });
    }); });
    on('ui.render', { component: 'AbovePrompt' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, Box, Text, Button, cols, view, goal, now, note, brief, id, beneath, hasBeneath, onPress, fixGoal, close, isReading, marked, lead, status, statusText, choices, digit, repButton, goalButton, goalButton3, headGlyph, headColor, goalText, head, clear, section;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (e.props.hasSurvey)
                        return [2 /*return*/, next(e)];
                    if (e.surface !== 'terminal' && e.surface !== 'desktop')
                        return [2 /*return*/, next(e)];
                    _a = $.ui.resolve(e), Box = _a.Box, Text = _a.Text, Button = _a.Button;
                    cols = Math.max(20, e.props.bodyColumns);
                    return [4 /*yield*/, (0, claude_code_1.read)($, viewA)];
                case 1:
                    view = (_b = (_d.sent())) !== null && _b !== void 0 ? _b : 'row';
                    return [4 /*yield*/, (0, claude_code_1.read)($, goalA)];
                case 2:
                    goal = _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, nowA)];
                case 3:
                    now = (_c = (_d.sent())) !== null && _c !== void 0 ? _c : IDLE;
                    return [4 /*yield*/, (0, claude_code_1.read)($, noteA)];
                case 4:
                    note = _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, briefA)];
                case 5:
                    brief = _d.sent();
                    id = sid;
                    return [4 /*yield*/, next(e)];
                case 6:
                    beneath = _d.sent();
                    hasBeneath = drawsSomething(beneath);
                    if (hasBeneath)
                        rememberOther($, id, (0, rep_1.textOf)(beneath)).catch(function () { return undefined; });
                    onPress = function () {
                        pressBrief($, id).catch(function () { return undefined; });
                    };
                    fixGoal = function () {
                        askGoal($, goal).catch(function () { return undefined; });
                    };
                    close = function () {
                        (0, claude_code_1.update)($, viewA, function () { return 'row'; }).catch(function () { return undefined; });
                    };
                    isReading = view === 'reading';
                    marked = now.mark !== '';
                    lead = function (glyph, color, tag, text) { return (<Box flexDirection="row">
        <Text color={color}>{glyph} </Text>
        <Box flexDirection="column" width={cols - 2}>
          <Text wrap="wrap">
            <Text dimColor>{tag} · </Text>
            {text}
          </Text>
        </Box>
      </Box>); };
                    status = isReading
                        ? 'reading the whole session…'
                        : now.doing + (now.helpers > 0 ? ", ".concat(now.helpers, " helper").concat(now.helpers === 1 ? '' : 's', " running") : '');
                    statusText = (<Text color={marked ? 'warning' : isReading ? 'suggestion' : undefined} dimColor={!marked && !isReading}>
        {status}
      </Text>);
                    choices = function () {
                        var buttons = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            buttons[_i] = arguments[_i];
                        }
                        return (<Box flexDirection="row" gap={3} paddingLeft={2}>
        {buttons}
      </Box>);
                    };
                    digit = function (d) { return (hasBeneath ? undefined : d); };
                    repButton = (<Button key="rep" plain hotkey={digit(PRESS_HOTKEY)} action={PRESS_ACTION} label="Brief me" onPress={onPress}/>);
                    goalButton = <Button key="goal" plain hotkey={digit('2')} label="Fix the goal" onPress={fixGoal}/>;
                    goalButton3 = <Button key="goal" plain hotkey="4" label="Fix the goal" onPress={fixGoal}/>;
                    headGlyph = marked ? '◆' : '◇';
                    headColor = marked ? 'warning' : 'suggestion';
                    goalText = goal !== null && goal !== void 0 ? goal : 'working out the result you want from your messages…';
                    head = lead(headGlyph, headColor, 'Owner rep', goalText);
                    if (view === 'note' && note !== null && !hasBeneath) {
                        clear = function () {
                            clearNote($).catch(function () { return undefined; });
                        };
                        return [2 /*return*/, (<Box flexDirection="column" marginTop={1}>
          {lead('◆', 'warning', 'Heads up', note.line)}
          {note.why !== '' ? (<Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {note.why}
              </Text>
            </Box>) : undefined}
          {choices(<Button key="brief" plain hotkey="1" label="Brief me" onPress={onPress}/>, <Button key="fine" plain hotkey="2" label="Fine" onPress={clear}/>, <Button key="later" plain hotkey="0" label="Later" onPress={clear}/>, statusText)}
        </Box>)];
                    }
                    if (view === 'brief' && brief !== null) {
                        section = function (label, text) {
                            return text === '' ? undefined : (<Box paddingLeft={2} width={cols}>
            <Text wrap="wrap">
              <Text bold>{label} </Text>
              {text}
            </Text>
          </Box>);
                        };
                        return [2 /*return*/, (<Box flexDirection="column" marginTop={1}>
          {head}
          {brief.well !== '' ? (<Box paddingLeft={2} width={cols}>
              <Text color="success" wrap="wrap">
                {brief.well}
              </Text>
            </Box>) : undefined}
          {section('Stands:', brief.stands)}
          {section('Means:', brief.means)}
          {brief.leftOut.length > 0 ? (<Box flexDirection="column" paddingLeft={2} width={cols}>
              <Text bold>Left out:</Text>
              {brief.leftOut.map(function (item, i) { return (<Text key={"left-".concat(i)} wrap="wrap">
                  {'  - '}
                  {item}
                </Text>); })}
            </Box>) : undefined}
          {section('Next:', brief.next)}
          {brief.checked !== null ? (<Box flexDirection="column" paddingLeft={2} width={cols}>
              <Text bold>Checked against the record and the files:</Text>
              {brief.checked.holds.map(function (item, i) { return (<Text key={"holds-".concat(i)} wrap="wrap">
                  {'  '}
                  <Text color="success">holds</Text>
                  {'  '}
                  {item}
                </Text>); })}
              {brief.checked.wrong.map(function (item, i) { return (<Text key={"wrong-".concat(i)} wrap="wrap">
                  {'  '}
                  <Text color="error">false</Text>
                  {'  '}
                  {item}
                </Text>); })}
              {brief.checked.notShown.map(function (item, i) { return (<Text key={"notshown-".concat(i)} wrap="wrap">
                  {'  '}
                  <Text color="warning">not shown</Text>
                  {'  '}
                  {item}
                </Text>); })}
              {brief.checked.changed.map(function (item, i) { return (<Text key={"changed-".concat(i)} wrap="wrap">
                  {'  '}
                  <Text color="suggestion">since then</Text>
                  {'  '}
                  {item}
                </Text>); })}
              {brief.checked.looked !== '' ? (<Text dimColor wrap="wrap">
                  {brief.checked.looked}
                </Text>) : undefined}
            </Box>) : undefined}
          {brief.isChecking ? (<Box paddingLeft={2}>
              <Text color="suggestion">Checking the record and the files… the card updates when it is done.</Text>
            </Box>) : undefined}
          {brief.checked === null && !brief.isChecking && brief.checkNote === '' ? (<Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {brief.checkCost}
              </Text>
            </Box>) : undefined}
          {brief.checkNote !== '' ? (<Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {brief.checkNote}
              </Text>
            </Box>) : undefined}
          {brief.message !== '' ? (<Box marginLeft={2} width={cols - 2} flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
              <Text wrap="wrap">{brief.message}</Text>
            </Box>) : undefined}
          {brief.does !== '' && brief.message !== '' ? (<Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {brief.does}
              </Text>
            </Box>) : undefined}
          {choices(brief.checked === null && !brief.isChecking ? (<Button key="check" plain hotkey="3" label="Check it" onPress={function () {
                                        pressCheck($, id).catch(function () { return undefined; });
                                    }}/>) : undefined, brief.message !== '' ? (<Button key="put" plain hotkey="1" label="Put message in prompt" onPress={function () {
                                        putMessage($, brief.message).catch(function () { return undefined; });
                                    }}/>) : undefined, <Button key="close" plain hotkey="2" label="Fine, close" onPress={close}/>, goalButton3, <Button key="later" plain hotkey="0" label="Later" onPress={close}/>)}
          <Box paddingLeft={2}>
            <Text dimColor>{brief.spent}</Text>
          </Box>
        </Box>)];
                    }
                    return [2 /*return*/, (<Box flexDirection="column" marginTop={1}>
        {head}
        {choices(statusText, repButton, goalButton)}
        {beneath}
      </Box>)];
            }
        });
    }); });
    on('session.end', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var id, rec, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, sessionId($)];
                case 1:
                    id = _b.sent();
                    return [4 /*yield*/, loadRec($, id)];
                case 2:
                    rec = _b.sent();
                    return [4 /*yield*/, saveRec($, rec)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, next(e)];
            }
        });
    }); });
};
exports.register = register;
