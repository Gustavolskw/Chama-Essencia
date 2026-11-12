package com.chamaessencia.stock;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.chamaessencia.stock.StockDtos.MaterialRequest;
import com.chamaessencia.stock.StockDtos.MaterialView;
import com.chamaessencia.stock.StockDtos.PurchaseRequest;
import com.chamaessencia.stock.StockDtos.PurchaseView;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class StockController {

    private final StockService service;

    public StockController(StockService service) {
        this.service = service;
    }

    @GetMapping("/materials")
    public List<MaterialView> materials() {
        return service.listMaterials();
    }

    @GetMapping("/materials/{id}")
    public MaterialView material(@PathVariable String id) {
        return service.materialView(id);
    }

    @PostMapping("/materials")
    @ResponseStatus(HttpStatus.CREATED)
    public MaterialView createMaterial(@Valid @RequestBody MaterialRequest req) {
        return service.createMaterial(req);
    }

    @PutMapping("/materials/{id}")
    public MaterialView updateMaterial(@PathVariable String id, @Valid @RequestBody MaterialRequest req) {
        return service.updateMaterial(id, req);
    }

    @DeleteMapping("/materials/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMaterial(@PathVariable String id) {
        service.deleteMaterial(id);
    }

    @GetMapping("/purchases")
    public List<PurchaseView> purchases(@RequestParam(required = false) String materialId) {
        return service.listPurchases(materialId);
    }

    @PostMapping("/purchases")
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseView createPurchase(@Valid @RequestBody PurchaseRequest req) {
        return service.createPurchase(req);
    }

    @PutMapping("/purchases/{id}")
    public PurchaseView updatePurchase(@PathVariable String id, @Valid @RequestBody PurchaseRequest req) {
        return service.updatePurchase(id, req);
    }

    @DeleteMapping("/purchases/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePurchase(@PathVariable String id) {
        service.deletePurchase(id);
    }
}
