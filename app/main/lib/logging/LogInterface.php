<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 05.08.2017
 * Time: 14:10
 */

namespace lib\logging;


interface LogInterface {

    public function setMessage(string $message);

    public function setLevel(string $level);

    public function setTag(string $tag);

    public function setData(array $data): LogInterface;

    public function setTempData(array $data): LogInterface;

    public function addHandler(string $handlerKey, string $formatterKey = null, \stdClass $handlerParams = null): LogInterface;

    public function addHandlerGroup(string $handlerKey): LogInterface;

    public function getHandlerConfig(): array;

    public function getHandlerParamsConfig(): array;

    public function getProcessorConfig(): array;

    public function getHandlerParams(string $handlerKey): array;

    public function getMessage(): string;

    public function getAction(): string;

    public function getChannelType(): string;

    public function getChannelName(): string;

    public function getLevel(): string;

    public function getData(): array;

    public function getContext(): array;

    public function getHandlerGroups(): array;

    public function getGroupHash(): string;

    public function hasHandlerKey(string $handlerKey): bool;

    public function hasHandlerGroupKey(string $handlerKey): bool;

    public function hasBuffer(): bool;

    public function isGrouped(): bool;

    public function removeHandlerGroups();

    public function removeHandlerGroup(string $handlerKey);

    public function buffer();
}